import {Widget} from '../widget.js'

export default class TextInput extends Widget{
	#input

	constructor(){
		super()

		this.addAttributeSlot('value', 'input', '', 'input')
		this.addAttributeSlot('placeholder', 'input', '', 'input')

		this.addProperty('text', '')
		this.addProperty('placeholder', '')
	}
}


