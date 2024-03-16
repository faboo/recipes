import ContentWidget from './contentWidget.js'

export default class Button extends ContentWidget{
	#button
	#onClick
	#onEnterPressed

	constructor(){
		super()

		this.addProperty('default', false, this.onDefaultChanged.bind(this), Boolean)
		this.#onClick = this.addEventSlot('onClick')
		this.addBooleanAttribute('disabled', 'button')

		this.#onEnterPressed = this.onEnterPressed.bind(this)
	}

	async bind(context, root){
		await super.bind(context, root)

		this.#button = this.firstElement('button')

		this.#button.addEventListener('click', this.onButtonClick.bind(this))
	}

	onDefaultChanged(event){
		if(this.default){
			window.addEventListener('keyup', this.#onEnterPressed)
		}
		else{
			window.removeEventListener('keyup', this.#onEnterPressed)
		}
	}

	onButtonClick(event){
		event.preventDefault()

		this.#onClick.trigger()
	}

	onEnterPressed(event){
		if(this.isVisible() && !this.disabled){
			if(event.code == 'Enter'){
				this.#button.click()
				event.preventDefault()
			}
		}
	}
}

