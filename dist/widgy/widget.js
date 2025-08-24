import {Widgy} from './base.js'
import {isListenable, BindingExpression} from './events.js'


export class Widget extends Widgy{
	static elementName = null
	static safeElementName = null
	static custom = false

	#bound
	#booleanAttributes

	constructor(){
		super()

		this.#bound = false

		this.#booleanAttributes = {}

		this.addProperty('application')
		this.addProperty('parent')
		this.addProperty('shown', null, this.onShownChanged)

		/* Drag and Drop */
		this.addProperty('dragdata')
		this.addProperty('dragdatatype')
		//this.addProperty('dropTarget', false, null, Boolean)
		this.addProperty('dropdatatype')
		this.addProperty('dropcontainer', false, null, Boolean)
		this.addProperty('dropover', false)

		this.addAttribute('id')
		this.addAttribute('hidden')
		this.addAttribute('class', 'className', '')
	}

	get elementName(){
		return this.constructor.elementName
	}

	get safeElementName(){
		return this.constructor.safeElementName
	}

	get bound(){
		return this.#bound
	}

	onShownChanged(){
		if(this.shown !== null)
			this.hidden = !this.shown
	}

	addProperty(name, initialValue, onChange, coerceType){
		if(name !== name.toLowerCase())
			console.warn(`Widget properties should be all lowercase - ${this.constructor.name}.${name} is not`)

		super.addProperty(name, initialValue, onChange, coerceType)
	}

	addAttribute(name, propName, defaultValue){
		function changed(){
			if(this.root)
				this.root[propName] = this[name]
		}

		propName = propName || name

		this.addProperty(name, defaultValue)
		this[name+'Property'].addEventListener(
			'setvalue',
			changed.bind(this))
	}

	booleanAttributeChanged(event){
		let attr = event.name
		let element = this.firstElement(this.#booleanAttributes[attr])

		if(element){
			if(this[attr]){
				element.setAttribute(attr, "")
			}
			else{
				element.removeAttribute(attr)
			}
		}
	}

	onDrop(event, data, type){
	}

	rawDrop(event){
		let type = this.application.getDragDataType()
		let data = this.application.takeDragData()

		event.preventDefault()

		this.onDrop(event, data, type)
	}

	rawDragover(event){
		if(!this.dropdatatype || window.currentApplication.getDragDataType() == this.dropdatatype){
			//event.dataTransfer.dropEffect = 'move'
			event.preventDefault()
		}
		else{
			//event.dataTransfer.dropEffect = 'none'
		}
	}

	rawDragenter(event){
		this.dropover = true
	}

	rawDragleave(event){
		this.dropover = false
	}

	addBooleanAttribute(name, selector, initialValue){
		this.addProperty(name, initialValue, this.booleanAttributeChanged)
		this.#booleanAttributes[name] = selector
	}

	async getWidget(name){
		let widget = await super.getWidget(name)

		widget.application = this.application

		return widget
	}

	bindProperty(context, property, value){
		let resolvedValue = this.resolveCompositeValue(context, this, property, value)

		if(!(resolvedValue instanceof BindingExpression)){
			this[property].value = resolvedValue
		}
	}

	bindBooleanAttributes(){
		for(let attr in this.#booleanAttributes){
			if(this[attr]){
				this.firstElement(this.#booleanAttributes[attr]).setAttribute(attr, "")
			}
			else{
				this.firstElement(this.#booleanAttributes[attr]).removeAttribute(attr)
			}
		}
	}

	createRoot(){
		let elementName = this.safeElementName

		return document.createElement(elementName)
	}

	async bind(context, root){
		this.root = this.createRoot()
		this.root.widget = this

		this.addGlobalProperties(context, this)

		for(let attr of root.attributes){
			if(this.hasEventSlot(attr.name)){
				this.bindEvent(attr.name, context, attr.value)
			}
			else if(isListenable(this[attr.name])){
				this.bindProperty(context, attr.name, attr.value)
			}
			else if(isListenable(this[attr.name+'Property'])){
				this.bindProperty(context, attr.name+'Property', attr.value)
			}
			else{
				console.error(`${this.constructor.name} as no property or event ${attr.name}`)
			}
		}

		if(!this.constructor.template)
			await this.sleep(() => this.constructor.template)
		this.root.appendChild(this.constructor.template.cloneNode(true))

		this.bindAttributesSlots()

		await this.populate(context)

		this.bindBooleanAttributes()

		this.#bound = true
	}

	isVisible(){
		let hasSize = this.root.offsetWidth || this.root.offsetHeight || this.root.getClientRects().length

    	return !!hasSize
	}
}
