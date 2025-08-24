import * as widgy from './widgy/widgy.js'
import * as dialog from './widgy/dialog.js'
import * as srch from './widgy/storage.js'
import {Recipe} from './recipe.js'

export class Api extends srch.RemoteStore{
	#connected

	constructor(){
		super()
		this.#connected = false
		this.identity = null
		this.otherChef = null
	}

	async post(url, body){
		let endpoint = location.host == 'localhost:4280'
			? 'http://localhost:7071/api/'
			: 'https://recipes.halfpanda.dev/api/'
		let bodyStr = JSON.stringify(body)
		let headers =
			{ 'Content-Type': 'application/json'
			}
		let response

		response = await fetch(
			endpoint + url,
			{ method: 'POST'
			, body: bodyStr
			, headers: headers
			})

		console.log(response)

		if(response.status == 401){
			throw Error('remote unauthorized')
		}

		response = await response.json()
		return response
	}

	get connected(){
		return this.#connected || this.otherChef
	}

	async init(){
		try{
			let response = await this.post('whoami')
			let result = { roles: [] }

			if(response.ok){
				result = response.result || { roles: [] }
			}
			else{
				console.warn(`Login unsuccessful: ${response.result}`)
				result = { roles: [] }
			}

			if(result.roles.indexOf('chef') >= 0)
				this.#connected = true

			this.identity = result
		}
		catch(ex){
			console.error(ex)
			console.warn('Getting chef identity failed')
			this.identity = { roles: [] }
		}

		return this.identity
	}

	async upsert(object, objectId, objectName){
		await this.post('upsert', object)
	}

	async getById(objectId, objectName, chef){
		let response = await this.post('get', {'id': objectId, 'chef': chef || this.otherChef})

		return response['result']
	}

	async listByChef(){
		let response = await this.post('list', {'chef': this.otherChef})
		let objects = []

		for(let entry of response.result){
			objects.push(
				{ id: entry.id
				, modified: new Date(entry.modified_time)
				, size: Object.keys(entry).length
				, content: entry
				})
		}

		return objects
	}

	async removeById(objectId, objectName){
		await this.post('delete', {'id': objectId})
	}

	async getAll(objectName){
		if(this.otherChef)
			return this.listByChef()

		let response = await this.post('list', { })
		let objects = []

		for(let entry of response.result){
			objects.push(
				{ id: entry.id
				, modified: new Date(entry.modified_time)
				, size: Object.keys(entry).length
				, content: entry
				})
		}

		return objects
	}
}


export default class App extends widgy.Application{
	constructor(){
		super()

		this.title = 'Recipe Box'
		this.identity = null
		this.api = null

		this.addProperty('selectedPane', 'loading')
		this.addProperty('recipes', new widgy.LiveArray([], Recipe))
		this.addProperty('selectedRecipe')
		this.addProperty('busy', true, this.onBusyChanged)
		this.addProperty('loggedIn', false)
		this.addProperty('myChef', false)
		this.addProperty('otherChef', null)

		this.addPath('', this.onPathList.bind(this), {})
		this.addPath('edit', this.onPathEdit.bind(this), {recipeId: Number})
		this.addPath('new', this.onPathNew.bind(this), {})
		this.addPath('view', this.onPathView.bind(this), {})
	}

	async bind(context, root){
		//await widgy.preloadWidget('recipe-list', true)
		//await widgy.preloadWidget('recipe-list-item', true)
		//await widgy.preloadWidget('raw-img', true)

		//widgy.preloadWidget('edit-recipe', true)
		//widgy.preloadWidget('edit-instruction', true)
		//widgy.preloadWidget('edit-ingredient', true)
		//widgy.preloadWidget('fraction-input', true)
		//widgy.preloadWidget('move-item', true)
		//widgy.preloadWidget('upload-image', true)

		//widgy.preloadWidget('view-recipe', true)
		//widgy.preloadWidget('view-instruction', true)

		await super.bind(context, root)

		console.log('Render time: '+(new Date() - window.startLoad))
		this.root.classList.add('rendered')
	}

	get databaseName(){
		let name = 'recipes'

		if(this.otherChef){
			name += '-' + this.otherChef
		}

		return name
	}

	async init(){
		await super.init()

		this.api = new Api()

		this.connectRemoteStore()

		await this.openDatabase()
	}

	async openDatabase(){
		this.recipes = new widgy.LiveArray()

		if(!this.databaseExists(this.databaseName)){
			await this.addDatabase(this.databaseName,
				{ version: 3
				, objects:
					{ Recipe:
						{ keyProperty: 'id'
						, keyType: 'uuid'
						}
					}
				})
			let database = this.getDatabase(this.databaseName)

			database.addEventListener('insert', this.onDatabaseInsert.bind(this))
			database.addEventListener('update', this.onDatabaseUpdate.bind(this))
			database.addEventListener('remove', this.onDatabaseRemove.bind(this))
			database.setRemoteStore(this.api)
		}
	}

	async connectRemoteStore(){
		this.identity = await this.api.init()

		if(this.api.connected){
			this.loggedIn = true
		}

		this.busy = false
	}

	// TODO: refresh the loaded recipes
	async syncRemoteDatabase(){
		let recipeDB = this.getDatabase(this.databaseName)

		console.log('Syncing data with remote database')

		this.busy = true

		try{
			await recipeDB.syncRemote()

			if(this.recipes.length == 0){
				for(let recipe of await recipeDB.getAll(Recipe))
					this.recipes.push(new Recipe(recipe))
			}
		}
		catch(ex){
			console.error(ex)
		}

		this.busy = false
	}

	onDatabaseInsert(event){
		if(event.remote){
			this.recipes.push(event.data)
		}
	}

	onDatabaseUpdate(event){
		if(event.remote){
			let recipe = this.recipes.find(rc => rc.id == event.data.id)

			if(recipe)
				recipe.loadFromTemplate(event.data)
		}
	}

	onDatabaseRemove(event){
		if(event.remote){
			let index = this.recipes.findIndex(rc => rc.id == event.data.id)

			this.recipes.splice(index, 1)
		}
	}

	async getRecipeById(recipeId, chef){
		let found = null

		if(chef){
			found = new Recipe(await this.api.getById(recipeId, null, chef))
		}
		else{
			for(let recipe of this.recipes.values()){
				if(recipe.id == recipeId){
					found = recipe
				}
			}
		}

		return found
	}

	async onPathList(options){
		let resetDatabase = this.otherChef != options.chef

		this.otherChef = this.api.otherChef = options.chef
		this.selectedRecipe = null
		this.selectedPane = 'list'
		this.myChef = !this.api.otherChef

		this.title = 'Recipe Box' + (this.otherChef? ` (${this.otherChef})` : '')

		if(resetDatabase)
			await this.openDatabase()

		await this.syncRemoteDatabase()
	}

	onPathNew(options){
		this.selectedRecipe = new Recipe()
		this.selectedPane = 'new'
	}

	onNewClicked(){
		this.selectedRecipe = new Recipe()
		this.selectedPane = 'new'

		this.setLocation('new', { })
	}

	async onPathEdit(options){
		this.selectedRecipe = await this.getRecipeById(options.recipeId)

		if(this.selectedRecipe)
			this.selectedPane = 'edit'
		else
			this.onCancelled()
	}

	onEditClicked(event){
		this.selectedRecipe = event.data
		this.selectedPane = 'edit'

		this.setLocation(
			'edit',
			{ recipeId: this.selectedRecipe.id
			})
	}

	async onPathView(options){
		if(options.chef)
			this.api.otherChef = options.chef

		this.selectedRecipe = await this.getRecipeById(options.recipeId, options.chef)

		if(this.selectedRecipe)
			this.selectedPane = 'view'
		else
			this.onCancelled()

		this.busy = false
	}

	onViewClicked(event){
		this.selectedRecipe = event.data
		this.selectedPane = 'view'

		this.setLocation(
			'view',
			{ recipeId: this.selectedRecipe.id
			})
	}

	async onSearchClicked(event){
		let recipeDB = this.getDatabase(this.databaseName)
		let search = { }
		let searchable = false

		if(event.data.name){
			searchable = true
			search.name = new srch.In(event.data.name)
		}

		if(event.data.ingredients){
			searchable = true
			search['ingredients.what'] = new srch.In(event.data.ingredients)
		}

		if(event.data.tags){
			searchable = true
			search.tags = new srch.In(event.data.tags)
		}

		if(searchable){
			let recipes = await recipeDB.search('Recipe', search)

			this.recipes = new widgy.LiveArray(recipes.map(rc => new Recipe(rc)))
		}
	}

	async onClearClicked(event){
		let recipeDB = this.getDatabase(this.databaseName)
		let recipes = await recipeDB.getAll('Recipe')

		this.recipes = new widgy.LiveArray(recipes.map(rc => new Recipe(rc)))
	}

	async onDeleteClicked(event){
		let recipe = event.data
		let index = this.recipes.findIndex(recp => recp.id === recipe.id)

		await this.getDatabase('recipes').removeById(recipe.id, 'Recipe')

		this.recipes.splice(index, 1)
	}

	async onRecipeSaved(event){
		let recipe = event.data
		this.busy = true

		if(this.selectedPane === 'new'){
			recipe.id = await this.getDatabase('recipes').insert(recipe)
			await this.recipes.push(recipe)
		}
		else{
			this.selectedRecipe.loadFromTemplate(recipe)
			await this.getDatabase('recipes').update(recipe)
		}

		this.selectedPane = 'list'
		this.selectedRecipe = null
		this.setLocation('', { })
		this.busy = false

		this.syncRemoteDatabase()
	}

	onCancelled(){
		let options = { }

		if(this.api.otherChef)
			options.chef = this.api.otherChef

		this.setLocation('', options)

		this.onPathList(options)
	}

	async onCopyRecipe(event){
		let recipe = event.data
		this.busy = true

		this.setLocation('', { })
		await this.onPathList({ })

		//TODO: Download image and reupload it?
		recipe.id = await this.getDatabase('recipes').insert(recipe)
		await this.recipes.push(recipe)
		await this.syncRemoteDatabase()

		this.busy = false
	}

	onLoginClicked(){
		window.location = '/login'
	}

	onMineClicked(){
		this.api.otherChef = null
		this.onCancelled()
	}

	onBusyChanged(){
		if(this.busy)
			this.root.classList.add('busy')
		else
			this.root.classList.remove('busy')
	}
}

