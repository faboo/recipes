import {Widget} from '../widget.js'

export default class ContentWidget extends Widget{
	#children

	async bind(context, root){
		await this.populateChildren(context, root, null)

		//this.#children = [...root.childNodes].map(elm => elm.cloneNode())
		this.#children = root.childNodes

		await super.bind(context, root)
		let children = this.#children
	
	}

	hasSpecialWidget(element){
		return element.nodeName.toLowerCase() == 'content'
	}

	getSpecialWidget(element){
		let content = document.createElement('content')

		content.append(...this.#children)

		return content
	}
}
