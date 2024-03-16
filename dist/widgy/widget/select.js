import {Widget} from '../widget.js'
import ItemsView from './items-view.js'

export default class Select extends ItemsView{
	#select

	constructor(){
		super()

		this.addProperty('name')
		this.addProperty('autocomplete')
		this.addProperty('selected', '', this.onItemSelected)
		this.addProperty('selecteditem', null)
		this.addProperty('editable', false, this.onEditableChanged, Boolean)
		this.addProperty('hideInput', true)

		this.addEventSlot('onSelect')

		this.addAttributeSlot('value', 'select', '', 'input')
		this.addAttributeSlot('value', 'input', '', 'input')
		this.addAttributeSlot('hidden', 'div.edit-container', true)

		this.addBooleanAttribute('multiple', 'select', false)
	}

	get content(){
		return this.#select
	}

	getTemplate(root){
		let template = root.querySelector('template')

		if(template){
			template.remove()
			template = template.content
		}

		return template
	}

	createItemElement(){
		return this.template.cloneNode(true).children[0]
	}

	hasSpecialWidget(element){
		return element.nodeName.toLowerCase() == 'select'
	}

	getSpecialWidget(element){
		this.#select = element

		return this.#select
	}

	async bind(context, root){
		let children = root.children

		await super.bind(context, root)

		let selected = this.selected

		if(this.items){
			if(!this.template)
				throw Error('If options property is set, a template must be supplied')

			if(this.items.length)
				this.selecteditem = this.items[0]
		}
		else{
			while(children.length){
				let child = await this.populateChild(children[0], context, null)
				this.content.append(child)
			}
		}

		this.content.valueProperty.value = selected
	}

	onItemsChanged(event){
		this.selecteditem = null
		super.onItemsChanged(event)
	}

	onItemsContentChanged(){
		super.onItemsContentChanged()

		if(this.items.length == 0)
			this.selecteditem = null
		else if(this.selecteditem === null)
			this.selecteditem = this.items[0]
	}

	onItemSelected(){
		if(this.items && this.items.length)
			this.selecteditem = this.items[this.#select ? this.#select.selectedIndex : 0]

	}

	onEditableChanged(){
		this.hideInput = !this.editable
	}
}



