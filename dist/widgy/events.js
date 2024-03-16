export function isListenable(object){
	return (
		object
		&&
		object.addEventListener
		&& 
		object.removeEventListener
		)
}

class ValueChangeEvent extends Event{
	#name
	#object
	#value
	#oldValue

	constructor(value, oldValue){
		super('setvalue', {bubbles: true})
		this.#value = value
		this.#name = value.name
		this.#object = value.object
		this.#oldValue = oldValue
	}

	get value(){
		return this.#value
	}

	get name(){
		return this.#name
	}

	get object(){
		return this.#object
	}

	get oldValue(){
		return this.#oldValue
	}
}


export class LiveValue extends EventTarget{
	#value
	#name
	#object
	#source
	#onSourceChanged
	#coerceType
	#changing

	constructor(value, name, object, coerceType){
		super()
		this.#value =
			value === undefined
			? null
			: isListenable(value)
			? value.value
			: value
		this.#name = name || ''
		this.#object = object
		this.#onSourceChanged = this.onSourceChanged.bind(this)
		this.#coerceType = coerceType
		this.#changing = false
	}

	get name(){
		return this.#name
	}

	get object(){
		return this.#object
	}

	get value(){
		return this.#value
	}

	set value(value){
		if(!this.changing){
			let oldValue = this.#value

			this.#changing = true

			if(value instanceof EventTarget){
				if(this.#source){
					this.#source.removeEventListener('setvalue', this.#onSourceChanged)
				}

				value.addEventListener('setvalue', this.#onSourceChanged)
				this.#source = value
				this.#value = value.value
			}
			else{
				this.#value = value
			}

			this.#value = this.coerceType(this.#value)

			this.dispatchEvent(new ValueChangeEvent(this, oldValue))

			this.#changing = false
		}
	}

	get changing(){
		return this.#changing
	}

	coerceType(value){
		if(this.#coerceType === Boolean){
			if(typeof(value) === 'string' || value instanceof String)
				value = value == 'true'? true : false
			else
				value = Boolean(value)
		}
		else if(this.#coerceType instanceof Function){
			value = this.#coerceType(value)
		}

		return value
	}

	_overrideValue(value){
		let dispatch = this.#value !== value
		let oldValue = this.#value
		this.#value = value

		if(dispatch){
			//console.log('Value '+this.name+' overridden to '+this.value)
			this.dispatchEvent(new ValueChangeEvent(this, oldValue))
		}
	}

	onSourceChanged(){
		let sourceValue = this.coerceType(this.#source.value)
		let dispatch = this.#value !== sourceValue
		let oldValue = this.#value

		this.#value = sourceValue

		if(dispatch){
			//console.log('Value '+this.name+' updated to '+this.value)
			this.dispatchEvent(new ValueChangeEvent(this, oldValue))
		}
	}

	addListener(listener){
		let event = new ValueChangeEvent(this)
		this.addEventListener('setvalue', listener)

		if(listener instanceof Function)
			listener(event)
		else
			listener.handleEvent(event)
	}
}


export const BooleanAttributes =
	[ 'hidden'
	]

export class LiveAttribute extends LiveValue {
	#element
	#event

	constructor(value, name, object, event, coerceType){
		super(value, name, object, coerceType)

		this.#event = event
	}

	get value(){
		return super.value
	}

	set value(value){
		super.value = value
		//this.#element.setAttribute(this.name, this.value)
		this.#element[this.name] = this.value
		if(this.value === true)
			this.#element.setAttribute(this.name, this.value)
		else if(this.value === false)
			this.#element.removeAttribute(this.name)
	}

	bind(element){
		this.#element = element
		//this.#element.setAttribute(this.name, this.value)
		this.#element[this.name] = this.value
		this.#element[this.name+'Property'] = this

		if(this.value === true)
			this.#element.setAttribute(this.name, this.value)
		else if(this.value === false)
			this.#element.removeAttribute(this.name)

		if(this.#event)
			this.#element.addEventListener(this.#event, this.onAttributeChanged.bind(this))
	}

	onSourceChanged(){
		let oldValue = this.#element[this.name]

		if(this.value === true)
			this.#element.setAttribute(this.name, this.value)
		else if(this.value === false)
			this.#element.removeAttribute(this.name)
		this.#element[this.name] = this.value
		this.dispatchEvent(new ValueChangeEvent(this, oldValue))
	}

	onAttributeChanged(){
		//console.log('Attribute '+this.name+' updated to '+this.value)
		//this._overrideValue(this.#element.getAttribute(this.name))
		this._overrideValue(this.#element[this.name])
	}
}


export const BindingDirection =
	{ '<': 1
	, '>': 2
	, '=': 3
	}


export class BindingExpression extends EventTarget{
	#onSourceChanged

	binding
	direction
	context
	target
	targetName
	targetValue
	sourcePath
	sourceValues
	currentValue

	constructor(binding, context, target, targetName){
		super()

		this.#onSourceChanged = this.onSourceChanged.bind(this)

		this.binding = binding

		if('<>='.includes(binding[0])){
			this.direction = BindingDirection[binding[0]]
			binding = binding.slice(1)
		}
		else{
			this.direction = BindingDirection['>']
		}

		/*
		if(binding.includes(',')){
		}
		*/

		this.context = context
		this.sourcePath = binding.split('.')
		this.sourceValues = []

		this.target = target
		this.targetName = targetName
		this.targetValue = this.getLiveValue(target, targetName)

		if(this.setSource)
			this.bindTarget()

		this.bindSource()
	}

	getLiveValue(object, name){
		let liveValue = undefined
		let propertyName = name+'Property'

		if(name){
			liveValue = object[name]

			if(!(liveValue instanceof EventTarget))
				liveValue = object[propertyName]
		}

		return liveValue
	}

	get setTarget(){
		return this.direction == BindingDirection['>'] || this.direction == BindingDirection['=']
	}

	get setSource(){
		return this.direction == BindingDirection['<'] || this.direction == BindingDirection['=']
	}

	get source(){
		return this.sourceValues.length == this.sourcePath.length
			? this.sourceValues[this.sourceValues.length - 1]
			: null
	}

	bindTarget(){
		this.targetValue.addListener(this.onTargetChanged.bind(this))
	}

	bindSource(){
		let live = this.getLiveValue(this.context, this.sourcePath[0])

		if(live === undefined){
			let error = `Binding failed: ${this.context.constructor.name} has no property ${this.sourcePath[0]} `
			if(this.target)
				error +=`for ${this.target.constructor.name} ${this.targetName}` 

			throw Error(error)
		}

		this.sourceValues.push(live)
		if(live instanceof LiveValue)
			live.addListener(this.#onSourceChanged)
		else
			this.onSourceChanged({value: live})
	}

	onTargetChanged(){
		let reset = this.currentValue !== this.targetValue.value
		let oldValue = this.currentValue

		this.currentValue = this.targetValue.value

		if(this.source && reset){
			this.source.value = this.currentValue
			this.dispatchEvent(new ValueChangeEvent(this, oldValue))
		}
	}

	onSourceChanged(event){
		let oldValue = this.currentValue
		let valueChanged = event.value
		let rebind = false
		let object

		for(let idx in this.sourcePath){
			if(this.sourceValues[idx] === valueChanged){
				rebind = true
				object = this.sourceValues[idx].value
			}
			else if(rebind && object){
				let name = this.sourcePath[idx]
				let value = this.sourceValues[idx]

				if(value){
					value.removeEventListener('setvalue', this.#onSourceChanged)
				}

				value = this.getLiveValue(object, name)
				this.sourceValues[idx] = value

				if(value){
					object = value.value
					value.addEventListener('setvalue', this.#onSourceChanged)
				}
				else{
					object = undefined
				}
			}
		}

		if(this.source && this.source.value !== this.currentValue){
			this.currentValue = this.source.value

			if(this.setTarget)
				if(this.targetValue)
					this.targetValue.value = this.source
				else if(this.target)
					this.target[this.targetName] = this.currentValue

			this.dispatchEvent(new ValueChangeEvent(this, oldValue))
		}
	}
}


export class LiveTextValue extends EventTarget {
	#context
	#template
	#onChange
	#bindings
	#value

	constructor(template, context){
		super()
		this.#context = context
		this.#template = template
		this.#onChange = this.onChange.bind(this)
		this.#bindings = []

		this.getBindings()

		this.interpolateText()
	}

	getBindings(){
		let escaped = false
		let property = null

		for(let chr of this.#template){
			if(property !== null)
				if(chr === '}'){
					let binding = new BindingExpression(property, this.#context)

					this.#bindings.push(binding)
					binding.addEventListener('setvalue', this.#onChange)

					property = null
				}
				else{
					property += chr
				}
			else if(escaped)
				;
			else if(chr === '\\')
				escaped = true
			else if(chr === '{')
				property = ''
		}
	}

	interpolateText(){
		let newChars = []
		let escaped = false
		let property = null
		let bindingIdx = 0

		for(let chr of this.#template){
			if(property !== null)
				if(chr === '}'){
					newChars.push(this.#bindings[bindingIdx].currentValue)
					property = null
					bindingIdx += 1
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

		this.#value = newChars.join('')
	}

	get value(){
		return this.#value
	}

	onChange(){
		let oldValue = this.#value

		this.interpolateText()

		this.dispatchEvent(new ValueChangeEvent(this, oldValue))
	}
}


export class LiveText{
	#textNode
	#value

	constructor(textNode, context){
		this.#textNode = textNode
		this.#value = new LiveTextValue(textNode.textContent, context)

		this.#value.addEventListener('setvalue', this.onChange.bind(this))
		this.onChange()
	}

	onChange(){
		this.#textNode.textContent = this.#value.value
	}
}


class SlottedEvent extends Event{
	data

	constructor(widget, data){
		super('slottedEvent', {bubbles: true})

		this.widget = widget
		this.data = data
	}
}


export class EventSlot extends EventTarget{
	#widget
	constructor(widget){
		super()
		this.#widget = widget
	}

	trigger(data){
		let event = new SlottedEvent(this.#widget, data)
		this.dispatchEvent(event)
	}
}
