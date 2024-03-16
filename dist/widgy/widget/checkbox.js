import ContentWidget from './contentWidget.js'

export default class Button extends ContentWidget{
	#clicked

	constructor(){
		super()

		this.#clicked = this.addEventSlot('clicked')
		this.addAttributeSlot('checked', 'input', false, 'input')
		this.addBooleanAttribute('checked', 'input', false)
	}

	async bind(root, context){
		await super.bind(root, context)

		this.children['input'].addEventListener('input', this.onCheckboxClicked.bind(this))
	}

	onCheckboxClicked(event){
		this.#clicked.trigger({checked: this.checked})
	}
}


