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


def getIdentity(req) -> 


@app.route(route='whoami')
def whoami(req:func.HttpRequest) -> func.HttpResponse:
    claimsBytes = base64.b64decode(req.headers['X-MS-CLIENT-PRINCIPAL'])
    claims = json.loads(claimsBytes)
    email = req.headers['X-MS-CLIENT-PRINCIPAL-NAME']
    identity = \
        { 'email': claims['userDetails']
        , 'roles': clames['userRoles']
        }

    response = {'ok': True, 'claims': claims, 'email': email}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")

@app.route(route='upsert')
def upsert(req:func.HttpRequest) -> func.HttpResponse:
    response = {'ok': True}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")
