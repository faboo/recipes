import logging
import os
import json
import base64
import azure.functions as func

app = func.FunctionApp()


@app.route(route='whoami')
def whoami(req:func.HttpRequest) -> func.HttpResponse:
    claimsBytes = base64.b64decode(req.headers['X-MS-CLIENT-PRINCIPAL'])
    claims = json.loads(claimsBytes)

    response = {'ok': True, 'claims': claims}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")

@app.route(route='upsert')
def upsert(req:func.HttpRequest) -> func.HttpResponse:
    response = {'ok': True}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")
