function promise(request){
	return new Promise((resolve, reject) => {
		request.onsuccess = evt => resolve(evt.target.result)
		request.onerror = evt => reject(evt.target.error)
	})
}

function isClass(object){
	let properties = Object.getOwnPropertyNames(object)

	return properties.includes('name') && !properties.includes('arguments')
}

export class SearchOption{
	compare(storedValue){
		return false
	}
}

export class Eq extends SearchOption{
	constructor(value){
		super()
		this.value = value
	}

	compare(storedValue){
		return this.value === storedValue
	}
}

export class LT extends SearchOption{
	constructor(value){
		super()
		this.value = value
	}

	compare(storedValue){
		return storedValue < this.value
	}
}

export class GT extends SearchOption{
	constructor(value){
		super()
		this.value = value
	}

	compare(storedValue){
		return storedValue > this.value
	}
}

export class In extends SearchOption{
	constructor(value){
		super()
		this.value = value.toLowerCase()
	}

	compare(storedValue){
		return storedValue.toLowerCase().includes(this.value)
	}
}

export class Fn extends SearchOption{
	constructor(func){
		super()
		this.func = func
	}

	compare(storedValue){
		return this.func(storedValue)
	}
}

export class DatabaseEvent extends Event{
	constructor(name, remote, data){
		super(name, {bubbles: true})
		this.remote = Boolean(remote)
		this.data = data === undefined? null : data 
	}
}

export class Database extends EventTarget{
	static{
	}

	#db
	#upgradeDatabase
	#remoteStore

	constructor(name, schema){
		super()

		this.#remoteStore = null
		this.#upgradeDatabase = this.upgradeDatabase.bind(this)
		this.name = name
		this.schema = schema
	}

	setRemoteStore(remoteStore){
		this.#remoteStore = remoteStore
		
		remoteStore.addConnectListener(this.triggerRemoteConnectEvent.bind(this))
		remoteStore.addDisconnectListener(this.triggerRemoteDisconnectEvent.bind(this))
	}

	addRemoteConnectListener(callback){
		this.addEventListener('remote-connect', callback)
	}
	addRemoteDisconnectListener(callback){
		this.addEventListener('remote-disconnect', callback)
	}
	triggerRemoteConnectEvent(){
		this.dispatchEvent(new DatabaseEvent('remote-connect', true, this.#remoteStore))
	}
	triggerRemoteDisconnectEvent(){
		this.dispatchEvent(new DatabaseEvent('remote-disconnect', true, this.#remoteStore))
	}

	async open(){
		this.#db =
			await new Promise((resolve, reject) => {
				let request = window.indexedDB.open(this.name, this.schema.version)

				request.onupgradeneeded = evt => this.upgradeDatabase(evt.target.result)
				request.onsuccess = evt => resolve(evt.target.result)
				request.onerror = evt => reject(evt.target.error)
			})
	}

	close(){
		this.#db.close()
	}

	upgradeDatabase(upgradeDB){
		for(let objectName in (this.schema.objects || {})){
			let objectSchema = this.schema.objects[objectName]
			let storeExists = Array.prototype.includes.call(upgradeDB.objectStoreNames, objectName)
			let store

			if(storeExists){
				// TODO: pull and reinsert existing objects
				upgradeDB.deleteObjectStore(objectName)
			}

			store = upgradeDB.createObjectStore(
				objectName,
				{ keyPath: objectSchema.keyProperty
				, autoIncrement: objectSchema.keyType === 'autoincrement'
				})

			for(let index of (this.schema.indices || [])){
				store.createIndex(
					index.name,
					index.keyPath,
					{ unique: index.unique
					, multiEntry: index.multiEntry
					, locale: index.locale
					})
			}
		}
	}

	transaction(objectName, mode){
		let tx = this.#db.transaction(objectName, mode || 'readwrite')

		tx.complete = new Promise((resolve, reject) => {
			tx.onsuccess = evt => resolve()
			tx.onerror = evt => reject(evt.target.error)
		})

		return tx
	}

	async insert(object, objectName){
		objectName = objectName || object.constructor.name

		if(!(objectName in this.schema.objects))
			throw Error('Object type '+objectName+' not defined in database '+this.name)

		if(object.toPOJO instanceof Function)
			object = object.toPOJO()
		let tx = this.transaction([objectName], 'readwrite')
		let store = tx.objectStore(objectName)
		let schema = this.schema.objects[objectName]
		let id

		if(schema.keyType === 'autoincrement')
			delete object[this.schema.objects[objectName].keyProperty]
		else if(schema.keyType === 'uuid')
			object[this.schema.objects[objectName].keyProperty] = crypto.randomUUID()

		object.modified_time = new Date().toUTCString()

		id = await promise(store.add(object))

		if(this.#remoteStore && this.#remoteStore.connected)
			try{
				await this.#remoteStore.upsert(object, id, objectName)
			}
			catch(ex){
				console.error(ex)
			}

		this.dispatchEvent(new DatabaseEvent('insert', false, object))

		return id
	}

	async update(object, objectName){
		objectName = objectName || object.constructor.name

		if(!(objectName in this.schema.objects))
			throw Error('Object type '+objectName+' not defined in database '+this.name)

		if(object.toPOJO instanceof Function)
			object = object.toPOJO()
		let tx = this.transaction([objectName], 'readwrite')
		let store = tx.objectStore(objectName)

		object.modified_time = new Date().toUTCString()

		await promise(store.put(object))

		if(this.#remoteStore && this.#remoteStore.connected)
			try{
				await this.#remoteStore.upsert(object, object[this.schema.objects[objectName].keyProperty], objectName)
			}
			catch(ex){
				console.error(ex)
			}

		this.dispatchEvent(new DatabaseEvent('update', false, object))
	}

	async removeById(objectId, objectName){
		let tx = this.#db.transaction([objectName], 'readwrite')
		let store = tx.objectStore(objectName)

		await promise(store.delete(objectId))

		if(this.#remoteStore && this.#remoteStore.connected)
			try{
				await this.#remoteStore.removeById(objectId, objectName)
			}
			catch(ex){
				console.error(ex)
			}

		this.dispatchEvent(new DatabaseEvent('remove', false, object))
	}

	async getById(objectId, objectName){
		let tx = this.#db.transaction([objectName], 'readwrite')
		let store = tx.objectStore(objectName)

		let object = await store.get(objectId)

		return object
	}

	async getAll(objectName){
		if(isClass(objectName))
			objectName = objectName.name

		if(!(objectName in this.schema.objects))
			throw Error('Object type '+objectName+' not defined in database '+this.name)

		let tx = this.#db.transaction([objectName], 'readwrite')
		let store = tx.objectStore(objectName)

		let objects = await promise(store.getAll())

		return objects
	}

	_getPropertyValues(object, pathStr){
		function lookup(obj, path){
			let parts = obj[path[0]]

			path = path.slice(1)

			if(path.length){
				if(parts instanceof Array){
					for(let part of parts)
						lookup(part, path)
				}
				else{
					lookup(parts, path)
				}
			}
			else{
				if(parts instanceof Array){
					for(let part of parts)
						values.push(part)
				}
				else{
					values.push(parts)
				}
			}
		}

		let values = []
		let path = pathStr.split('.')

		lookup(object, path)

		return values
	}

	search(objectName, searchObject, limit){
		let tx = this.#db.transaction([objectName], 'readwrite')
		let store = tx.objectStore(objectName)
		let found = []
		let promise = new Promise((resolve, reject) => {
			store.openCursor().onsuccess = (event) => {
				let cursor = event.target.result

				if(cursor && (!limit || found.length < limit)){
					try{
						let object = cursor.value
						let fits = true

						for(let key in searchObject){
							let values = this._getPropertyValues(object, key)
							let fit = false

							for(let value of values){
								fit ||= value !== undefined && searchObject[key].compare(value)
							}

							fits &&= fit
						}

						if(fits)
							found.push(object)

						cursor.continue()
					}
					catch(ex){
						reject(ex)
					}
				}
				else{
					resolve(found)
				}
			}
		})

		return promise
	}

	get remoteConnected(){
		return this.#remoteStore && this.#remoteStore.connected
	}

	connectRemote(){
		this.#remoteStore.connect()
	}

	async syncRemote(favorRemote){
		if(!this.#remoteStore.connected)
			return

		try{
			for(let objectName in this.schema.objects){
				let remote = {}
				let local = {}

				favorRemote = favorRemote === undefined? true : favorRemote

				for(let localObject of await this.getAll(objectName)){
					let objStr = JSON.stringify(localObject)
					local[localObject.id] =
						{ id: localObject.id
						, modified: new Date(localObject.modified_time)
						, size: objStr.length
						, content: localObject
						}
				}

				for(let remoteObject of await this.#remoteStore.getAll(objectName)){
					remote[remoteObject.id] = remoteObject
				}

				for(let id of Object.keys(local).concat(Object.keys(remote))){
					let localObject = local[id]
					let remoteObject = remote[id]
					let update = true
					let useRemote = favorRemote

					if(localObject && remoteObject){
						if(localObject.modified > remoteObject.modified){
							useRemote = false
						}
						else if(localObject.modified.getTime() == remoteObject.modified.getTime()){
							update = false
						}
					}
					else if(localObject){
						useRemote = false
					}

					if(update){
						if(useRemote){
							let object = await this.#remoteStore.getById(id, objectName)
							let tx = this.transaction([objectName], 'readwrite')
							let store = tx.objectStore(objectName)

							object.modified_time = remoteObject.modified.toUTCString()

							try{
								if(localObject){
									await promise(store.put(object))
									this.dispatchEvent(new DatabaseEvent('update', true, object))
								}
								else{
									await promise(store.add(object))
									this.dispatchEvent(new DatabaseEvent('insert', true, object))
								}
							}
							catch(ex){
								console.error(ex)
							}
						}
						else{
							try{
								await this.#remoteStore.upsert(localObject.content, id, objectName)
							}
							catch(ex){
								console.error(ex)
							}
						}
					}
				}
			}
		}
		catch(ex){
			console.error(ex)
		}
	}
}


export class RemoteStore extends EventTarget{
	addConnectListener(callback){
		this.addEventListener('connect', callback)
	}
	addDisconnectListener(callback){
		this.addEventListener('connect', callback)
	}
	triggerConnectEvent(){
		this.dispatchEvent(new Event('connect', {bubbles: true}))
	}
	triggerDisconnectEvent(){
		this.dispatchEvent(new Event('connect', {bubbles: true}))
	}
}


export class Dropbox extends RemoteStore{
	static DBX = '.dropboxapi.com/2/files/'
	static API = 'api'
	static CONTENT = 'content'

	#redirectPath
	#appKey
	#code
	#verifier
	#authToken

	constructor(appKey, redirectPath){
		super()

		this.#redirectPath = redirectPath
		this.#appKey = appKey
		this.#code = null
		this.#verifier = localStorage.getItem('widgy:dropbox:verifier')
		this.#authToken = localStorage.getItem('widgy:dropbox:authToken')

		this.storeToken()
	}

	get connected(){
		return this.#authToken !== null
	}

	connect(){
		let codeVerifier = crypto.randomUUID()+'-'+crypto.randomUUID()
		let redirectUrl = encodeURIComponent(window.location.origin + '/' + this.#redirectPath)
		let dropboxurl = 'https://www.dropbox.com/oauth2/authorize?'
			+'response_type=code&code_challenge_method=plain&token_access_type=online'
			+`&client_id=${this.#appKey}`
			+`&code_verifier=${codeVerifier}`
			+`&code_challenge=${codeVerifier}`
			+`&redirect_uri=${redirectUrl}`

		localStorage.setItem('widgy:dropbox:verifier', codeVerifier)
		
		window.location = dropboxurl
	}

	clearAuthToken(){
		this.#authToken = null
		localStorage.removeItem('widgy:dropbox:authToken')
		this.triggerDisconnectEvent()
	}

	storeToken(){
		let query = window.location.search.replace(/^\?/, '').split('&').map(kvp => kvp.split('='))
			.reduce((obj, kvp) => ((obj[kvp[0]] = kvp[1]) , obj), { })

		if(query.code){
			this.#code = query.code

			this.getAuthToken()
		}
	}

	async getAuthToken(force){
		// TODO or expired
		if(!this.#authToken || force){
			let code = this.#authToken? this.#authToken : this.#code
			let redirectUrl = encodeURIComponent(window.location.origin + '/' + this.#redirectPath)
			let bodyStr = `grant_type=authorization_code`
				+`&code=${this.#code}`
				+`&redirect_uri=${redirectUrl}`
				+`&client_id=${this.#appKey}`
				+`&code_verifier=${this.#verifier}`
			let response = await fetch(
				'https://api.dropboxapi.com/oauth2/token',
				{ method: 'POST'
				, body: bodyStr
				, headers:
					{ 'Content-Type': 'application/x-www-form-urlencoded'
					}
				})
			
			console.log(response)

			response = await response.json()

			if(response && response.access_token){
				this.#authToken = response.access_token
				localStorage.setItem('widgy:dropbox:authToken', this.#authToken)
				this.triggerConnectEvent()
			}
		}

		return this.#authToken
	}

	async post(url, apiArg, body, reauth){
		let endpoint = Dropbox.API
		let bodyStr = JSON.stringify(body)
		let headers =
			{ 'Content-Type': 'text/plain; charset=dropbox-cors-hack'
			}
		let query = { }
		let queryArr = []
		let response

		if(apiArg){
			headers['Dropbox-API-Arg'] = JSON.stringify(apiArg)
			endpoint = Dropbox.CONTENT
		}
		if(url == 'download'){
			headers['Content-Type'] = 'text/plain; charset=utf-8'
		}

		query.authorization = 'Bearer '+(await this.getAuthToken(reauth))

		for(let param in query){
			queryArr.push(encodeURIComponent(param)+'='+encodeURIComponent(String(query[param])))
		}

		response = await fetch(
			'https://'+endpoint+Dropbox.DBX + url + '?'+queryArr.join('&'),
			{ method: 'POST'
			, body: bodyStr
			, headers: headers
			})

		console.log(response)

		if(response.status == 401){
			if(!reauth){ // Only try this once
				response = await this.post(url, apiArg, body, true)
			}
			else{
				this.clearAuthToken()
				throw Error('remote unauthorized')
			}
		}

		return response
	}

	async upsert(object, objectId, objectName){
		let date = new Date(object.modified_time)
		let response = await this.post(
			'upload',
			{ path: '/'+objectName+'/'+objectId+'.json'
			, mode: 'overwrite'
			, autorename: false
			, client_modified:
				// "%Y-%m-%dT%H:%M:%SZ"
				`${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()}T${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}Z`
			},
			object)

		return response
	}

	async getById(objectId, objectName){
		let response = await this.post(
			'download',
			{ path: `/${objectName}/${objectId}.json`
			})

		return await response.json()
	}

	async removeById(objectId, objectName){
		let response = await this.post(
			'delete_v2',
			{ path: `/${objectName}/${objectId}.json`
			})

		await response.json()
	}

	async getAll(objectName){
		let response = await this.post(
			'list_folder',
			null,
			{ path: '/'+objectName
			, include_non_downloadable_files: false
			})
		let objects = []

		response = await response.json()

		for(let entry of response.entries)
			objects.push(
				{ id: entry.name.replace('.json', '')
				, modified: new Date(entry.client_modified)
				, size: entry.size
				, content: null
				})

		return objects
	}
}
