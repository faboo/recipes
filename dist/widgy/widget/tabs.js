import Selector from './selector.js'

export default class Tabs extends Selector{
	#buttons

	constructor(){
		super()

		this.selectedProperty.addEventListener('setvalue', this.onSelectedChanged.bind(this))
	}

	hasSpecialWidget(element){
		return element.nodeName.toLowerCase() == 'buttons' || super.hasSpecialWidget(element)
	}

	getSpecialWidget(element){
		let widget

		if(element.nodeName.toLowerCase() == 'buttons'){
			widget = element
			this.buildTabs(element)
		}
		else{
			widget = super.getSpecialWidget(element)
		}
		
		return widget
	}

	async buildTabs(buttons){
		this.#buttons = buttons

		for(let pane of this.children){
			let key = pane.widget.key
			let button = document.createElement('button')

			button.innerText = key 
			button.setAttribute('onClick', 'onTabClicked')

			button = await this.populateChild(button, this)

			button.key = key
			buttons.appendChild(button)

			if(this.selected === null){
				this.selected = key
				button.className = 'selected'
			}
		}
	}

	onTabClicked(event){
		this.selected = event.widget.root.key
	}

	onSelectedChanged(){
		if(this.bound && this.#buttons){
			for(let button of this.#buttons.children){
				if(button.key === this.selected)
					button.className = 'selected'
				else
					button.className = ''
			}
		}
	}
}
