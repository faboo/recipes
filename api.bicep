param location string = resourceGroup().location
param suffix string = uniqueString(resourceGroup().id)
param appName string = 'api-${suffix}'

resource storage 'Microsoft.Storage/storageAccounts@2022-05-01' = {
  name: 'storage${suffix}'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// "Function Apps" are basically the container for the Azure Function code
resource funcapp 'Microsoft.Web/sites@2022-03-01' = {
  name: appName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    clientAffinityEnabled: false
    reserved: true // because we want to run on Linux (nobody says why)

    siteConfig: {
      linuxFxVersion: 'python|3.10' // The runtime name must be lowercase, and separated from the version by a pipe (not colon!)
      // seem necessary anyway

      // each setting is also exposed to Python in os.environ
      appSettings: [
        { name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
        { name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        // Needed for V2 python interface
        { name: 'AzureWebJobsFeatureFlags'
          value: 'EnableWorkerIndexing'
        }
        { name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value}'
        }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }

      ]
    }
  }
}

