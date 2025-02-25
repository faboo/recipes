from typing import cast, List
import logging
import os
import uuid
import json
import base64
import dataclasses
import azure.functions as func
from azure.storage.blob import ContainerClient

app = func.FunctionApp()

@dataclasses.dataclass
class Identity:
    email:str
    roles:List[str]


def getIdentity(req:func.HttpRequest, raiseErrors:bool=False) -> Identity|None:
    identity:Identity|None = None
    try:
        claimsBytes = base64.b64decode(req.headers['X-MS-CLIENT-PRINCIPAL'])
        claims = json.loads(claimsBytes)
        identity = Identity(email=claims['userDetails'], roles=claims['userRoles'])
    except Exception:
        logging.exception('No ID found, assuming anonymous')
        if raiseErrors:
            raise

    return identity


class Recipes:
    def __init__(self, identity:Identity|None) -> None:
        self.identity = identity

        if os.getenv('blob_connstr') is not None:
            self.container = ContainerClient.from_connection_string(
                os.getenv('blob_connstr'),
                'recipe',
                None)

        else:
            self.container = ContainerClient(
                'https://%s.blob.core.windows.net' % os.getenv('blob_id'),
                'recipe',
                os.getenv('blob_key'))

    @property
    def chef(self) -> str|None:
        return self.identity.email if self.identity else None


    def upsert(self, recipe:dict) -> None:
        identity = cast(Identity, self.identity)
        id = recipe['id']
        with self.container.get_blob_client(f'{identity.email}/{id}.json') as blob:
            try:
                existing = json.loads(blob.download_blob(encoding='utf-8'))
            except Exception:
                existing = {}

            if 'imageUrl' in recipe:
                del recipe['imageUrl']
            recipe = {**existing, **recipe}

            block = json.dumps(recipe).encode('utf-8')
            blockId = str(uuid.uuid1())
            blob.stage_block(block_id=blockId, data=block)
            blob.commit_block_list([blockId])


    def list(self, chef:str|None) -> List[dict]:
        chef = self.chef if chef is None else chef
        search = f'{chef}/'
        logging.info('search: %s', search)
        blobs = self.container.list_blobs(name_starts_with=search)
        recipes:List[dict] = []

        if chef is None:
            raise Exception('No chef')

        logging.info('Chef: %s, Blobs: %s', chef, blobs)

        for blobProps in blobs:
            logging.info('BlobProps: %s', blobProps)
            with self.container.get_blob_client(blob=blobProps.name) as blob:
                content = blob.download_blob(encoding='utf-8')
                recipe = json.load(content)

                if self.chef != chef and not recipe.get('public'):
                    logging.info('Chef is not us and recipe is not public')
                    continue

                if 'image' in recipe:
                    if recipe['image']:
                        recipe['imageUrl'] = \
                            'https://recipes.halfpanda.dev/api/image/'+chef+'/'+recipe['id']
                    del recipe['image']
                elif 'imageUrl' in recipe:
                    del recipe['imageUrl']

                recipes.append(recipe)

        return recipes


    def get(self, id:str, chef:str|None) -> dict:
        if chef is None:
            chef = self.chef

        if chef is None:
            raise Exception('No chef')

        name = f'{chef}/{id}.json'

        with self.container.get_blob_client(name) as blob:
            content = blob.download_blob(encoding='utf-8')
            recipe = json.load(content)

            if chef != self.chef and not recipe.get('public'):
                raise Exception('Not found')

            if 'image' in recipe:
                if recipe['image']:
                    recipe['imageUrl'] = \
                        'https://recipes.halfpanda.dev/api/image/'+chef+'/'+recipe['id']
                del recipe['image']
            elif 'imageUrl' in recipe:
                del recipe['imageUrl']
            
            return recipe


    def getImage(self, id:str, chef:str|None) -> bytes|None:
        if chef is None:
            chef = self.chef

        name = f'{chef}/{id}.json'

        with self.container.get_blob_client(name) as blob:
            content = blob.download_blob(encoding='utf-8')
            recipe = json.load(content)

            if chef != self.chef and not recipe.get('public'):
                logging.info('Chef isn\'t us recipe isn\'t public')
                image = None

            elif recipe.get('image'):
                image = base64.b64decode(recipe['image'])
            else:
                logging.info('Recipe has no image')
                image = None

        return image


    def delete(self, id:str) -> None:
        identity = cast(Identity, self.identity)
        with self.container.get_blob_client(f'{identity.email}/{id}.json') as blob:
            blob.delete_blob()


    def __enter__(self) -> 'Recipes':
        return self


    def __exit__(self, exctype, excval, exctb) -> None:
        self.shutdown()


    def shutdown(self) -> None:
        self.container.close()


@app.route(route='whoami')
def whoami(req:func.HttpRequest) -> func.HttpResponse:
    response:dict
    code = 200
    try:
        identity = getIdentity(req, True)

        response = \
            { 'ok': True
            , 'result': dataclasses.asdict(identity) if identity else None
            }
    except Exception as ex:
        response = {'ok': False, 'result': str(ex) }
        code = 500

    return func.HttpResponse(
        json.dumps(response),
        status_code=code,
        mimetype="application/json")


@app.route(route='upsert')
def upsert(req:func.HttpRequest) -> func.HttpResponse:
    code = 200
    try:
        request = req.get_json()
        with Recipes(getIdentity(req)) as store:
            store.upsert(request)

        response = {'ok': True}
    except Exception as ex:
        response = {'ok': False, 'result': str(ex) }
        code = 500

    return func.HttpResponse(
        json.dumps(response),
        status_code=code,
        mimetype="application/json")


@app.route(route='list')
def list(req:func.HttpRequest) -> func.HttpResponse:
    code = 200
    try:
        options = req.get_json() or { }
        with Recipes(getIdentity(req)) as store:
            recipes = store.list(options.get('chef'))

        response = {'ok': True, 'result': recipes}
    except Exception as ex:
        logging.exception('Error listing recipes')
        response = {'ok': False, 'result': str(ex)}
        code = 500


    return func.HttpResponse(
        json.dumps(response),
        status_code=code,
        mimetype="application/json")


@app.route(route='get')
def get(req:func.HttpRequest) -> func.HttpResponse:
    request = req.get_json()
    code = 200
    try:
        with Recipes(getIdentity(req)) as store:
            recipe = store.get(request['id'], request.get('chef'))
        
        response = {'ok': True, 'result': recipe}
    except Exception as ex:
        logging.exception('Error getting recipe')
        response = {'ok': False, 'result': str(ex)}
        code = 500
    return func.HttpResponse(
        json.dumps(response),
        status_code=code,
        mimetype="application/json")


@app.route(route='image/{id}')
def image(req:func.HttpRequest) -> func.HttpResponse:
    recipeId = req.route_params.get('id')

    logging.info('Getting image for %s', recipeId)
    with Recipes(getIdentity(req)) as store:
        image = store.getImage(recipeId, None)

    if image:
        logging.info('Returning decoded image %s', len(image))
        return func.HttpResponse(image, mimetype="image")
    else:
        return func.HttpResponse(status_code=404)


@app.route(route='image/{chef}/{id}')
def publicImage(req:func.HttpRequest) -> func.HttpResponse:
    recipeId = req.route_params.get('id')
    chef = req.route_params.get('chef')

    logging.info('Getting image for %s', recipeId)
    with Recipes(getIdentity(req)) as store:
        image = store.getImage(recipeId, chef)

    if image:
        logging.info('Returning decoded image %s', len(image))
        return func.HttpResponse(image, mimetype="image")
    else:
        return func.HttpResponse(status_code=404)


@app.route(route='delete')
def delete(req:func.HttpRequest) -> func.HttpResponse:
    request = req.get_json()
    with Recipes(getIdentity(req)) as store:
        store.delete(request['id'])
    
    response = {'ok': True}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")
