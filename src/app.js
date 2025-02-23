import * as widgy from './widgy/widgy.js'
import * as dialog from './widgy/dialog.js'
import * as srch from './widgy/storage.js'
import {Recipe} from './recipe.js'

export class Api extends srch.RemoteStore{
	constructor(chef){
		super()
		this.connected = false
		this.identity = null
		this.otherChef = chef
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

	async init(){
		try{
			let response = await this.post('whoami')
			let result = response.result || { roles: [] }

			if(result.roles.indexOf('chef') >= 0)
				this.connected = true

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
		let response = await this.post('get', {'id': objectId, 'chef': chef})

		return response['result']
	}

	async listByChef(){
		let response = await this.post('list', {'chef': this.chef})
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

		let response = await this.post('list')
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
		this.otherChef = null
		this.api = null

		this.addProperty('selectedPane', 'loading')
		this.addProperty('recipes', new widgy.LiveArray())
		this.addProperty('selectedRecipe')
		this.addProperty('busy', true, this.onBusyChanged)

		this.addPath('', this.onPathList.bind(this), {})
		this.addPath('edit', this.onPathEdit.bind(this), {recipeId: Number})
		this.addPath('new', this.onPathNew.bind(this), {})
		this.addPath('view', this.onPathView.bind(this), {})
	}

	async bind(context, root){
		await widgy.preloadWidget('recipe-list', true)
		await widgy.preloadWidget('recipe-list-item', true)
		await widgy.preloadWidget('raw-img', true)

		widgy.preloadWidget('edit-recipe', true)
		widgy.preloadWidget('edit-instruction', true)
		widgy.preloadWidget('edit-ingredient', true)
		widgy.preloadWidget('fraction-input', true)
		widgy.preloadWidget('move-item', true)
		widgy.preloadWidget('upload-image', true)

		widgy.preloadWidget('view-recipe', true)
		widgy.preloadWidget('view-instruction', true)

		await super.bind(context, root)

		console.log('Render time: '+(new Date() - window.startLoad))
	}

	async init(){
		await super.init()

		await this.addDatabase('recipes',
			{ version: 3
			, objects:
				{ Recipe:
					{ keyProperty: 'id'
					, keyType: 'uuid'
					}
				}
			})

		let recipeDB = this.getDatabase('recipes')
		this.api = new Api()

		this.identity = await this.api.init()

		recipeDB.setRemoteStore(this.api)

		await recipeDB.syncRemote()

		for(let recipe of await recipeDB.getAll(Recipe))
			this.recipes.push(new Recipe(recipe))
		this.busy = false
	}

	// TODO: refresh the loaded recipes
	async syncRemoteDatabase(){
		let recipeDB = this.getDatabase('recipes')

		console.log('Syncing data with remote database')

		this.busy = true

		try{
			await recipeDB.syncRemote()
		}
		catch(ex){
			console.error(ex)
		}

		this.busy = false
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

	onPathList(options){
		this.api.otherChef = options.chef
		this.selectedRecipe = null
		this.selectedPane = 'list'
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
		let recipeDB = this.getDatabase('recipes')
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
			let recipes = await recipeDB.search( 'Recipe', search)

			this.recipes = new widgy.LiveArray(recipes.map(rc => new Recipe(rc)))
		}
	}

	async onClearClicked(event){
		let recipeDB = this.getDatabase('recipes')
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

		this.selectedPane = 'list'
		this.selectedRecipe = null
		this.setLocation('', options)

		this.syncRemoteDatabase()
	}

	onLoginClicked(){
		window.location = '/login'
	}

	onDropboxConnect(){
		let recipeDB = this.getDatabase('recipes')

		recipeDB.connectRemote()
	}

	onBusyChanged(){
		if(this.busy)
			this.root.className += ' busy'
		else
			this.root.className = this.root.className.replace(/ ?busy ?/, '')
	}
}

