import {LiveValue} from './events.js'
import {Widgy, BASE} from './base.js'
import {Database} from './storage.js'

export class Application extends Widgy{
	static currentApplication
	
	#head
	#title
	#body
	#dialogGutter
	#databases
	#paths
	#dragData

	constructor(){
		super()

		this.#databases = {}
		this.#paths = {}
		this.#dragData =
			{ nativeData: null
			, type: null
			, rawData: null
			}

		this.addProperty('title', '', this.onTitleChange.bind(this))
	}

	async init(){
	}

	loadInitialPath(){
		if(Object.keys(this.#paths).length != 0)
			this.onPopstate()
	}

	addPath(path, callback, options){
		let mustSignup = Object.keys(this.#paths).length == 0

		this.#paths[path] = {callback: callback, options: options}

		if(mustSignup)
			window.addEventListener('popstate', this.onPopstate.bind(this))
	}

	onPopstate(event){
		let hash = window.location.hash
		let path = hash? hash.match('^#(.*)/')[1] : ''
		let optionsStr = hash.replace(/^.*\//, '')
		let options = { }
		

		for(let optStr of optionsStr.split('&')){
			if(optStr){
				let [key, value] = optStr.split('=')

				options[key] = decodeURIComponent(value)
			}
		}

		if(path in this.#paths)
			this.#paths[path].callback(options)
	}

	setLocation(path, options){
		let hash = path.replace(/\/?$/, '')+'/'
		let optStr = []

		for(let option in options){
			optStr.push(option+'='+encodeURIComponent(options[option]))
		}

		hash += optStr.join('&')

		history.pushState(
			{path: path, options: options},
			document.title,
			window.location.pathname+'#'+hash)
	}

	async getWidget(name){
		let widget = await super.getWidget(name)

		widget.application = this

		return widget
	}

	async bind(context, root){
		let css = document.createElement('link')

		css.rel = 'stylesheet'
		css.href = BASE + '/widgy.css'

		this.root = root

		this.#head = this.root.querySelector('head')
		this.#body = this.root.querySelector('body')
		this.#title = document.createElement('title')

		let existingTitle = this.#head.querySelector('title')

		this.#head.appendChild(css)

		if(existingTitle)
			this.#head.replaceChild(this.#title, existingTitle)
		else
			this.#head.appendChild(this.#title)

        this.#title.textContent = this.title

		await this.populate(context, this.#body)

		this.#dialogGutter = document.createElement('widgy-dialog-gutter')
		this.root.appendChild(this.#dialogGutter)
	}

	setDragData(data, type){
		this.#dragData.nativeData = data
		this.#dragData.type = type
	}

	getDragDataType(){
		return this.#dragData.type
	}

	takeDragData(){
		let data = this.#dragData.nativeData

		this.#dragData.nativeData = null
		this.#dragData.rawData = null
		this.#dragData.type = null

		return data
	}

	onTitleChange(){
		if(this.#title)
			this.#title.textContent = this.title
	}

	async addDatabase(name, schema){
		if(name in this.#databases)
			throw Error('Database already exists: '+name)

		this.#databases[name] = new Database(name, schema)
		await this.#databases[name].open()
	}

	getDatabase(name){
		return this.#databases[name]
	}

	async openDialog(dialogClass, bindings, context){
		let dialogElement = document.createElement(dialogClass.safeElementName)
		let dialogWidget = new dialogClass()

		// TODO: is instanceof Dialog ?
		
		dialogWidget.parent = this
		dialogWidget.application = this

		for(let attr in bindings){
			dialogElement.setAttribute(attr, bindings[attr])
		}

		await dialogWidget.bind(context, dialogElement)

		this.#dialogGutter.appendChild(dialogElement)

		return dialogWidget
	}
}
