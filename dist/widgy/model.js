import {LiveValue} from './events.js'

export class LiveObject{
	addProperty(name, initialValue, onChange, coerceType){
		let nameProperty = name+'Property'
		Object.defineProperties(
			this,
			{ [name]:
				{ get: () => this[nameProperty].value
				, set: (value) => this[nameProperty].value = value
				, enumerable: true
				}
			, [nameProperty]:
				{ value: new LiveValue(initialValue, name, this, coerceType)
				, writable: false
				, enumerable: false
				}
			})

		if(onChange){
			this[nameProperty].addEventListener('setvalue', onChange.bind(this))
		}
	}

	getCallbackValue(context, property){
		let navigatedParts = ''
		let parts = property.split('.')
		let callback = parts.pop()
		let live = null
		let obj = context
		let value

		for(let part of parts){
			if(obj !== null && obj !== undefined && part in obj){
				if(part+'Property' in obj)
					live = obj[part+'Property']
				else
					live = null
				obj = obj[part]
				navigatedParts += part+'.'
			}
			else{
				return null
			}
		}

		if(!(callback in obj))
			throw Error(`${context.constructor.name} has no path to event handler ${property}`)

		return obj[callback].bind(obj)
	}

	getPropertyValue(property){
		let navigatedParts = ''
		let parts = property.split('.')
		let live = null
		let obj = this
		let value

		for(let part of parts){
			if(obj !== null && obj !== undefined && part in obj){
				if(part+'Property' in obj)
					live = obj[part+'Property']
				else
					live = null
				obj = obj[part]
				navigatedParts += part+'.'
			}
			else{
				return '#ERR-noprop-'+navigatedParts+part
			}
		}

		return live? live : obj
	}

	getPropertyString(property){
		let value = this.getPropertyValue(property)

		if(value instanceof LiveValue)
			value = value.value

		return String(value)
	}

	interpolateText(text){
		let newChars = []
		let escaped = false
		let property = null

		for(let chr of text){
			if(property !== null)
				if(chr === '}'){
					newChars.push(this.getPropertyString(property))
					property = null
				}
				else{
					property += chr
				}
			else if(escaped)
				newChars.push(chr)
			else if(chr === '\\')
				escaped = true
			else if(chr === '{')
				property = ''
			else
				newChars.push(chr)
		}

		return newChars.join('')
	}
}


export class ArrayChangeEvent extends Event{
	#array

	constructor(array){
		super('setvalue', {bubbles: true})

		this.#array = array
	}

	get array(){
		return this.#array
	}
}


export class LiveArray extends Array{
	static get [Symbol.species]() {
		return Array;
	}

	#dispatchItemChanged
	#eventTarget

	constructor(contents){
		super()
		this.#dispatchItemChanged = this.dispatchItemChanged.bind(this)
		this.#eventTarget = new EventTarget()

		if(contents){
			for(let item of contents)
				this.push(item)
		}
	}

	toPOJO(){
		let array = []

		for(let value of this){
			value = value.value

			if(value !== null && value.toPOJO instanceof Function)
				value = value.toPOJO()

			array.push(value)
		}

		return array
	}

	at(index){
		return this[index].value
	}

	to(index, value){
		this[index].value  = value
	}

	push(item){
		let live = new LiveValue(
			item,
			null,
			this)
		let result = super.push(live)

		live.addEventListener('setvalue', this.#dispatchItemChanged)
		this.dispatchItemChanged()

		return result
	}

	pop(){
		let live = super.pop()

		live.removeEventListener('setvalue', this.#dispatchItemChanged)
		this.dispatchItemChanged()

		return live.value
	}

	shift(){
		let live = super.shift()

		live.removeEventListener('setvalue', this.#dispatchItemChanged)
		this.dispatchItemChanged()

		return live.value
	}

	unshift(item){
		let live = new LiveValue(
			item,
			null,
			this)
		let result = super.unshift(live)

		live.addEventListener('setvalue', this.#dispatchItemChanged)
		this.dispatchItemChanged()

		return result
	}

	splice(start, deleteCount, item1, item2){
		let deletedDead = []

		for(let idx = 2; idx < arguments.length; ++idx){
			arguments[idx] = new LiveValue(
					arguments[idx],
					null,
					this)
			arguments[idx].addEventListener('setvalue', this.#dispatchItemChanged)
		}

		for(let item of super.splice(...arguments)){
			item.removeEventListener('setvalue', this.#dispatchItemChanged)
			deletedDead.push(item.value)
		}

		this.dispatchItemChanged()

		return deletedDead
	}

	values(){
		let values = []

		for(let value of this)
			values.push(value.value)

		return values
	}

	findIndex(func){
		return super.findIndex(item => func(item.value))
	}

	join(sep){
		return this.values().join(sep)
	}

	sort(compareFn){
		this.sort(compareFn)

		this.dispatchItemChanged()
	}

	// copyWithin
	// entries
	// every
	// fill
	// filter
	// find
	// flatMap
	// forEach
	// includes
	// indexOf
	// keys
	// lastIndexOf
	// map
	// reduce
	// reduceRight
	// reverse
	// slice
	// some
	// sort

	addEventListener(type, listener){
		this.#eventTarget.addEventListener(type, listener)
	}

	removeEventListener(type, listener){
		this.#eventTarget.removeEventListener(type, listener)
	}

	addListener(listener){
		let event = new ArrayChangeEvent(this)
		this.addEventListener('setvalue', listener)

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

export class Model extends LiveObject{
    loadFromTemplate(template){
		if(template instanceof LiveValue)
			template = template.value

        for(let prop in this){
            if(prop in template){
				if(this[prop] instanceof LiveArray){
					this[prop].splice(0)
					
					for(let item of template[prop]){
						this[prop].push(item)
					}
				}
				else{
					this[prop] = template[prop]
				}
            }
        }
    }

	toPOJO(){
		let obj = {}

		for(let prop in this){
			let value = this[prop]

			if(value !== null && value.toPOJO instanceof Function)
				value = value.toPOJO()

			obj[prop] = value
		}

		return obj
	}
}

export function createModel(properties){
	class SimpleModel extends Model {
		constructor(template){
			super()

			for(let prop of properties)
				this.addProperty(prop)

			if(template)
				this.loadFromTemplate(template)
		}
	}

	return SimpleModel
}
