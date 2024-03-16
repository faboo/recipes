import {Widget} from '../widget.js'

export default class NumberInput extends Widget{
	#input

	constructor(){
		super()

		this.addAttributeSlot('value', 'input', '', 'input')
		this.addAttributeSlot('placeholder', 'input', '')
		this.addAttributeSlot('min', 'input', '')
		this.addAttributeSlot('max', 'input', '')
		this.addAttributeSlot('step', 'input', '1')

		this.addProperty('number', 0)
		this.addProperty('placeholder', '')
		this.addProperty('min', '')
		this.addProperty('max', '')
		this.addProperty('step', '1')
	}

	async bind(context, root){
		await super.bind(context, root)
	}
}



