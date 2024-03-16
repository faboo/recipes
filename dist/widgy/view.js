import {LiveValue} from './events.js'
import {LiveObject, ArrayChangeEvent} from './model.js'

export class View extends LiveObject{
	#updates
	#updateProperties
	#model

	constructor(model){
		super()

		this.#updates = {}
		this.#updateProperties = this.updateProperties.bind(this)
		this.#model = model

		for(let prop in this.#model){
			let propName = prop+'Property'

			if(propName in this.#model){
				this.#model[propName].addEventListener('setvalue', this.#updateProperties)
			}
		}
	}

	get model(){
		return this.#model
	}

	addProperty(name, initialValue, onChange, coerceType){
		super.addProperty(name, initialValue, onChange, coerceType)

		this[name+'Property'].addEventListener('setvalue', this.#updateProperties)
	}

	addView(name, func, onChange){
		let nameProperty = name+'Property'
		let liveValue = new LiveValue(func.call(this), name, this)

		this.#updates[nameProperty] = func.bind(this)
		
		Object.defineProperties(
			this,
			{ [name]:
				{ get: () => this[nameProperty].value
				, enumerable: true
				}
			, [nameProperty]:
				{ value: liveValue
				}
			})

		if(onChange){
			liveValue.addEventListener('setvalue', onChange.bind(this))
		}
	}

	updateProperties(){
		for(let prop in this.#updates){
			this[prop].value = this.#updates[prop]()
		}
	}
}


export class ArrayView extends Array{
	static get [Symbol.species]() {
		return Array;
	}

	#eventTarget
	#contents
	#viewFilter
	#itemView

	constructor(contents, viewFilter, itemView){
		super()
		this.#contents = contents || []
		this.#eventTarget = new EventTarget()
		this.#viewFilter = viewFilter? viewFilter : item => true
		this.#itemView = itemView

		if(contents){
			for(let item of contents){
				if(this.#viewFilter(item)){
					if(this.#itemView)
						item = new this.#itemView(item)
					super.push(item)
				}
			}
		}
	}

	resetView(){
		for(let item of this.#contents)
			if(this.#viewFilter(item)){
				if(this.#itemView)
					item = new this.#itemView(item)
				super.push(item)
			}

		this.dispatchItemChanged()
	}

	set contents(contents){
		super.splice(0, this.length)
		this.#contents = contents

		this.resetView()
	}

	set viewFilter(viewFilter){
		super.splice(0, this.length)
		this.#viewFilter = viewFilter? viewFilter : item => true

		this.resetView()
	}

	push(item){
		return item
	}

	pop(){
		return this[0]
	}

	shift(){
		return this[this.length-1]
	}

	unshift(item){
		return item
	}

	splice(start, deleteCount, item1, item2){
		return this.slice(start, start+deleteCount)
	}

	values(){
		return this.slice()
	}

	addEventListener(type, listener){
		this.#eventTarget.addEventListener(type, listener)
	}

	removeEventListener(type, listener){
		this.#eventTarget.removeEventListener(type, listener)
	}

	addListener(listener){
		let event = new ArrayChangeEvent(this)
		this.addEventListener('setchange', listener)

		if(listener instanceof Function)
			listener(event)
		else
			listener.handleEvent(event)
	}

	dispatchItemChanged(){
		this.#eventTarget.dispatchEvent(new ArrayChangeEvent(this))
	}

	get value(){
		return this
	}
}
