import logging
import os
import json
import base64
import dataclasses
import azure.functions as func

app = func.FunctionApp()

@dataclasses.dataclass
class Identity:
    email:str
    roles:list[str]


def getIdentity(req:func.HttpRequest) -> Identity:
    claimsBytes = base64.b64decode(req.headers['X-MS-CLIENT-PRINCIPAL'])
    claims = json.loads(claimsBytes)
    identity = Identity(email=claims['userDetails'], roles=claims['userRoles'])
    return identity


@app.route(route='whoami')
def whoami(req:func.HttpRequest) -> func.HttpResponse:
    try:
        #claimsBytes = base64.b64decode(req.headers['X-MS-CLIENT-PRINCIPAL'])
        #claims = json.loads(claimsBytes)
        #email = req.headers['X-MS-CLIENT-PRINCIPAL-NAME']
        identity = getIdentity(req)

        response = {'ok': True, 'response': dataclasses.asdict() }
    except Exception as ex:
        response = {'ok': False, 'response': str(ex) }

    return func.HttpResponse(json.dumps(response), mimetype="application/json")
        

@app.route(route='upsert')
def upsert(req:func.HttpRequest) -> func.HttpResponse:
    response = {'ok': True}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")
