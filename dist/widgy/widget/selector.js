import {LiveValue} from '../events.js'
import {Widget} from '../widget.js'

export default class Selector extends Widget{
	#children

	constructor(){
		super()

		this.#children = []
		this.addProperty('selected', null)
	}

	get children(){
		return this.#children
	}

	async bind(context, root){
		for(let child of root.children){
			if(child.nodeName.toLowerCase() == 'select-pane'){
				child = await this.populateChild(child, context, null)
				this.#children.push(child)
			}
		}

		await super.bind(context, root)
	}

	hasSpecialWidget(element){
		return element.nodeName.toLowerCase() == 'content'
	}

	getSpecialWidget(element){
		let content = document.createElement('content')

		content.append(...this.children)

		return content
	}
}
