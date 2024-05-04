import logging
import os
import json
import azure.functions as func

app = func.FunctionApp()


@app.route(route='validate')
def upsert(req:func.HttpRequest) -> func.HttpResponse:
    response = {'ok': True}
    return func.HttpResponse(json.dumps(response), mimetype="application/json")
