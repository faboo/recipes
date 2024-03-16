import {Widgy} from '../base.js'
import {Widget} from '../widget.js'
import {LiveValue} from '../events.js'

export default class Dialog extends Widget{
	baseTemplate

	#header
	#content
	#buttons
	#buttonClick
	#resolveButtonClick

	constructor(){
		super()

		this.addEventSlot('onClose')

		this.addBooleanAttribute('open', 'dialog', true)

		this.#buttonClick = new Promise(resolve => {
				this.#resolveButtonClick = resolve
			})
	}

	close(){
		this.root.parentElement.removeChild(this.root)
		this.triggerEvent('onClose')
	}

	setButtonClicked(buttonName){
		this.#resolveButtonClick(buttonName)
	}

	getButtonClicked(){
		return this.#buttonClick
	}

	async bind(context, root){
		let template

		this.root = root // We get this from Application fresh
		this.root.widget = this

		for(let attr of root.attributes){
			if(this.hasEventSlot(attr.name)){
				this.bindEvent(attr.name, context, attr.value)
			}
			else if(this[attr.name] instanceof LiveValue){
				this.bindProperty(context, attr.name, attr.value)
			}
			else if(this[attr.name+'Property'] instanceof LiveValue){
				this.bindProperty(context, attr.name+'Property', attr.value)
			}
		}

		if(!Dialog.baseTemplate)
			Dialog.baseTemplate = await Widgy.getTemplate('dialog', 'dialog', false)
		if(!this.constructor.template)
			this.constructor.template = await Widget.getTemplate(this.elementName, this.safeElementName, false)

		template = this.constructor.template.cloneNode(true)

		this.root.appendChild(Dialog.baseTemplate.cloneNode(true))

		this.#header = template.querySelector('header')
		this.#content = template.querySelector('content')
		this.#buttons = template.querySelector('buttons')

		await this.populateChildren(this, this.#header, this.safeElementName)
		await this.populateChildren(this, this.#content, this.safeElementName)
		await this.populateChildren(this, this.#buttons, this.safeElementName)

		this.bindAttributesSlots()

		await this.populate(context)

		this.bindBooleanAttributes()
	}

	hasSpecialWidget(element){
		return element.nodeName.toLowerCase() in {header:1, content:1, buttons:1}
	}

	getSpecialWidget(element){
		let widgetName = element.nodeName.toLowerCase()
		let content = document.createElement(widgetName)

		if(widgetName === 'header')
			content = this.#header
		else if(widgetName === 'content')
			content = this.#content
		else if(widgetName === 'buttons')
			content = this.#buttons

		return content
	}
}


