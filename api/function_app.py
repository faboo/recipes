from typing import cast, List
import logging
import os
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


def getIdentity(req:func.HttpRequest) -> Identity|None:
    identity:Identity|None = None
    try:
        claimsBytes = base64.b64decode(req.headers['X-MS-CLIENT-PRINCIPAL'])
        claims = json.loads(claimsBytes)
        identity = Identity(email=claims['userDetails'], roles=claims['userRoles'])
    except Exception:
        logging.exception('No ID found, assuming anonymous')

    return identity


class Recipes:
    def __init__(self, identity:Identity|None) -> None:
        self.identity = identity
        self.container = ContainerClient(
            'https://%s.blob.core.windows.net' % os.getenv('blob_id'),
            'recipe',
            os.getenv('blob_key'))


    def upsert(self, recipe:dict) -> None:
        identity = cast(Identity, self.identity)
        id = recipe['id']
        with self.container.get_blob_client(f'{identity.email}/{id}.json') as blob:
            blob.upload_blob(json.dumps(recipe).encode('utf-8'))


    def list(self) -> List[dict]:
        identity = cast(Identity, self.identity)
        blobs = self.container.list_blobs(name_starts_with=f'{identity.email}/')
        recipes:List[dict] = []

        for blobProps in blobs:
            with self.container.get_blob_client(blob=blobProps.name) as blob:
                content = blob.download_blob(encoding='utf-8')
                recipes.append(json.load(content))

        return recipes


    def get(self, id:str) -> dict:
        name = f'{self.identity.email}/{id}.json' \
            if self.identity \
            else f'{id}.json'

        with self.container.get_blob_client(name) as blob:
            content = blob.download_blob(encoding='utf-8')
            return json.load(content)


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
    try:
        identity = getIdentity(req)

        response = \
            { 'ok': True
            , 'response': dataclasses.asdict(identity) if identity else None
            }
    except Exception as ex:
        response = {'ok': False, 'response': str(ex) }

    return func.HttpResponse(json.dumps(response), mimetype="application/json")


@app.route(route='upsert')
def upsert(req:func.HttpRequest) -> func.HttpResponse:
    request = req.get_json()
    with Recipes(getIdentity(req)) as store:
        store.upsert(request)

    response = {'ok': True}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")


@app.route(route='list')
def list(req:func.HttpRequest) -> func.HttpResponse:
    with Recipes(getIdentity(req)) as store:
        recipes = store.list()

    for recipe in recipes:
        recipe['image'] = 'https://recipes.halfpanda.dev/api/image/'+recipe['id']

    response = {'ok': True, 'result': recipes}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")


@app.route(route='get')
def get(req:func.HttpRequest) -> func.HttpResponse:
    request = req.get_json()
    with Recipes(getIdentity(req)) as store:
        recipe = store.get(request['id'])
    
    recipe['image'] = 'https://recipes.halfpanda.dev/api/image/'+recipe['id']
    response = {'ok': True, 'result': recipe}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")


@app.route(route='image/{id}')
def image(req:func.HttpRequest) -> func.HttpResponse:
    request = req.get_json()
    recipeId = req.route_params.get('id')

    with Recipes(getIdentity(req)) as store:
        recipe = store.get(recipeId)
    
    if recipe.get('image'):
        image = base64.b64decode(recipe['image'])
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
