import {LiveValue} from '../events.js'
import {Widget} from '../widget.js'
import {Widgy} from '../base.js'

export default class ItemsView extends Widget{
	#onItemsChanged
	#onItemsContentChanged
	#template
	#content
	#context

	constructor(){
		super()

		this.#content = null
		this.#onItemsChanged = this.onItemsChanged.bind(this)
		this.#onItemsContentChanged = this.onItemsContentChanged.bind(this)
		this.addProperty('items', null, this.#onItemsChanged)
	}

	get content(){
		return this.#content
	}

	get template(){
		return this.#template
	}

	getTemplate(root){
		let template = null

		for(let child of root.children)
			if(child.localName == 'template')
				template = child

		if(template === null){
			template = document.createElement('template')
			while(root.children.length)
				template.content.appendChild(root.children[0])
		}

		return template.content
	}

	async bind(context, root){
		this.#context = context
		this.#template = this.getTemplate(root)

		await super.bind(context, root)

		if(this.items)
			for(let idx = 0; idx < this.items.length; ++idx){
				let element = this.createItemElement(this.items[idx])

				await this.bindItemElement(element, this.items[idx], idx)

				this.content.append(element)
			}
	}

	createItemElement(item){
		let root = document.createElement('item-view')

		root.appendChild(this.#template.cloneNode(true))

		return root
	}

	async bindItemElement(element, liveValue, index){
		let context = new Widgy()

		context.addProperty('context', this.#context)
		context.addProperty('item', null)
		context.addProperty('index', index+1)

		context.itemProperty.value = liveValue

		element.widget = this
		element.liveValue = liveValue
		element.context = context

		this.addGlobalProperties(context, element)
		this.bindAttributes(context, element)

		await this.populateChildren(context, element, null)
	}

	hasSpecialWidget(element){
		return element.nodeName.toLowerCase() == 'content'
	}

	getSpecialWidget(element){
		this.#content = document.createElement('content')

		return this.#content
	}

	updateItems(){
		if(this.bound){
			let idx = 0
			if(this.items)
				for(; idx < this.items.length; ++idx){
					if(idx < this.content.childElementCount){
						let element = this.content.children[idx]

						if(element.liveValue != this.items[idx]){
							element.liveValue = this.items[idx]
							element.context.item = element.liveValue
						}
					}
					else{
						let element = this.createItemElement(this.items[idx])

						// No need to wait for this.
						this.bindItemElement(element, this.items[idx], idx)

						this.content.append(element)
					}
				}

			while(idx < this.content.childElementCount)
				this.content.children[idx].remove()
		}
	}

	onItemsChanged(event){
		if(event.oldValue && event.oldValue.removeEventListener)
			event.oldValue.removeEventListener('setvalue', this.#onItemsContentChanged)
		if(this.bound)
			this.content.innerHTML = ''
		this.updateItems()
		if(this.items.addEventListener)
			this.items.addEventListener('setvalue', this.#onItemsContentChanged)
	}

	onItemsContentChanged(){
		this.updateItems()
	}
}

