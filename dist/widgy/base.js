export const BASE = import.meta.url.replace(/\/[^\/]*\.js/, '')

import {isListenable, LiveValue, LiveTextValue, LiveText, LiveAttribute, EventSlot, BindingExpression} from './events.js'
import {LiveObject} from './model.js'

const BUILTIN_TAG =
	[ 'a', 'address', 'area', 'article', 'aside', 'audio'
	, 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br'
	, 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'content'
	, 'div', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt'
	, 'em', 'embed'
	, 'fieldset', 'figcaption', 'footer', 'form'
	, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html'
	, 'i', 'iframe', 'img', 'image', 'input', 'ins' // <image> isn't real, but Firefox treats it exactly like <img>
	, 'kdb', 'keygen'
	, 'label', 'legend', 'li', 'link'
	, 'main', 'map', 'mark', 'menu', 'meta', 'meter'
	, 'nav', 'noscript'
	, 'object', 'ol', 'optgroup', 'option', 'output'
	, 'p', 'param', 'picture', 'pre', 'progress'
	, 'q'
	, 'rp', 'rt', 'rtc', 'ruby'
	, 's', 'samp', 'section', 'slot', 'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup'
	, 'table', 'tbody', 'td', 'template', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track'
	, 'u', 'ul'
	, 'var', 'video'
	, 'wbr'
	].reduce((table, elm) => table[elm] = null || table, { })

const NO_RECURSE_TAG =
	[ 'style', 'script'
	].reduce((table, elm) => table[elm] = null || table, { })

const RENAME_ELEMENT =
	[ 'button', 'select', 'textarea'
	].reduce((table, elm) => table[elm] = null || table, { })

const ATTRIBUTE_SUBSTITUTION =
	{ 'class': 'className'
	}

const GLOBAL_PROPERTIES =
	[ [ 'draghandle', 'draggable', false, Boolean ]
	, [ 'dragtarget', null, false, Boolean ]
	, [ 'dragborder', null, false, Boolean ]

	, [ 'droptarget', null, false, Boolean ]

	, [ 'class', 'className', '', String ]
	]

export const LoadedWidget = { }

export class Widgy extends LiveObject{
	static #domParser = new DOMParser()
	static customWidgetBase = BASE.replace(/\/[^/]+$/, '')
	static template = null

	static parseFragment(html){
        return Widgy.#domParser.parseFromString(html, 'text/html').querySelector('template')
	}

	static processStyle(prefix, style){
		let styleParts = style.split('}')

		for(let idx = 0; idx < styleParts.length; idx++){
			let rule = styleParts[idx].trimStart()

			if(rule.length && !rule.startsWith('@media')){
				if(rule[0] == '{'){
					styleParts[idx] = '\n'+prefix+' '+rule
				}
				else{
					let ruleParts = rule.split('{')

					ruleParts[0] = ruleParts[0].replace(/^|, ?/g, '$&'+prefix+' ')

					rule = ruleParts.join('{')
					styleParts[idx] = '\n'+rule
				}
			}
		}

		return styleParts.join('}')
	}

	static async getTemplate(name, safeName, custom){
		let template

		template = document.getElementById('widgy-template-'+name)

		if(!template && !custom){
			//console.log('Loading internal template: '+name)
			let response = await fetch(BASE+'/widget/'+name+'.html')
			let text = await response.text()
			template = Widgy.parseFragment(text)
		}
		
		if(!template){
			//console.log('Loading custom template: '+name)
			let response = await fetch(Widgy.customWidgetBase+'/'+name+'.html')
			let text = await response.text()
			template = Widgy.parseFragment(text)
		}

		if(template){
			for(let node of template.content.children){
				if(node.nodeName == 'STYLE'){
					let style = Widgy.processStyle(safeName, node.textContent)
					let styleElement = document.createElement('style')

					styleElement.textContent = style
					styleElement.setAttribute('id', 'widgy-style-'+name)

					document.head.appendChild(styleElement)

					template.content.removeChild(node)
				}
			}
		}

		return template? template.content : null
	}

	static async loadWidget(name, custom){
		let module
		let widgetClass = null

		if(custom){
			try{
				module = await import(Widgy.customWidgetBase+'/'+name+'.js')
				widgetClass = module.default
				widgetClass.custom = true
			}
			catch(ex){
				console.error('Could not load custom widget: '+name)
				console.error(ex)
			}
		}
		else{
			try{
				module = await import(BASE+'/widget/'+name+'.js')
				widgetClass = module.default
			}
			catch(ex){
				if(ex instanceof TypeError && ex.message.includes('dynamically imported module')){
					try{
						module = await import(Widgy.customWidgetBase+'/'+name+'.js')

						if(module.default){
							widgetClass = module.default
							widgetClass.custom = true
						}
						else{
							console.error('Custom widget is missing default export: '+name)
						}
					}
					catch(ex){
						console.error('Could not load custom widget: '+name)
						console.error(ex)
					}
				}
				else{
					console.error('Could not load widget: '+name)
					console.error(ex)
				}
			}
		}

		return widgetClass
	}

	static async getWidgetClass(name, custom){
		let widgetClass

		if(!(name in LoadedWidget)){
			LoadedWidget[name] = Widgy.loadWidget(name, custom)
			LoadedWidget[name] = await LoadedWidget[name]
		}
		else if(LoadedWidget[name] instanceof Promise){
			LoadedWidget[name] = await LoadedWidget[name]
		}

		widgetClass = LoadedWidget[name]

		if(!Object.hasOwn(widgetClass, 'elementName')){
			widgetClass.elementName = name
			widgetClass.safeElementName = name in RENAME_ELEMENT
				? 'widgy-'+name
				: name
		}

		if(!Object.hasOwn(widgetClass, 'template')){
			widgetClass.template = await Widgy.getTemplate(name, widgetClass.safeElementName, widgetClass.custom)

			if(widgetClass.template === null){
				let parentWidget = Object.getPrototypeOf(widgetClass)
				widgetClass.template = parentWidget.template
				widgetClass.elementName = parentWidget.elementName
			}
		}

		return widgetClass
	}


	root
	#children
	#eventSlots
	// TODO: Move this concept into Widget
	#attributeSlots

	constructor(){
		super()
		this.#eventSlots = {}
		this.#attributeSlots = []
		this.#children = {}
	}

	get children(){
		return this.#children
	}

	firstElement(selector){
		let root = this.root.shadowRoot || this.root

		if(selector)
			return root.querySelector(selector)
		else
			return root
	}

	findContainerElement(child, boolProp){
		let lookback = 10
		let container = null
		let element = child

		while(element && lookback && !container){
			if(element[boolProp] || (element.widget && element.widget[boolProp]))
				container = element

			lookback -= 1
			element = element.parentElement
		}

		return container || child
	}

	addEventSlot(name){
		return this.#eventSlots[name.toLowerCase()] = new EventSlot(this)
	}

	hasEventSlot(name){
		return name in this.#eventSlots
	}

	bindEvent(name, context, callback){
		if((typeof callback) === 'string' || callback instanceof String)
			callback = this.getCallbackValue(context, callback)

		this.#eventSlots[name].addEventListener('slottedEvent', callback)
	}

	triggerEvent(name, data){
		this.#eventSlots[name.toLowerCase()].trigger(data)
	}

	addAttributeSlot(name, selector, initialValue, event){
		this.#attributeSlots.push(
			[ selector
			, new LiveAttribute(initialValue, name, this, event)
			])
	}

	bindAttributesSlots(){
		for(let [selector, attribute] of this.#attributeSlots){
			let element = selector? this.firstElement(selector) : this.root
			let value = element.getAttribute(attribute.name)
			let resolvedValue

			attribute.bind(element)

			resolvedValue = this.resolveCompositeValue(this, element, attribute.name, value)

			if(!(resolvedValue instanceof BindingExpression)){
				element.setAttribute(attribute.name, resolvedValue)
			}
		}
	}

	hasLiveText(text){
		let live = false
		let escaped = false
		
		for(let chr of text){
			if(escaped){
				escaped = false
			}
			else if(chr === '\\'){
				escaped = true
			}
			else if(chr === '{'){
				live = true
				break
			}
		}

		return live
	}

	async getWidget(name){
		let widgetClass = await Widgy.getWidgetClass(name)
		let widget = new widgetClass()

		widget.parent = this

		return widget
	}

	hasSpecialWidget(element){
		return false
	}

	getSpecialWidget(element){
		return element
	}
	
	async bind(context, root){
	}

	resolveCompositeValue(context, target, name, value){
		let resolvedValue = value

		if(value){
			if(value.startsWith('@')){
				resolvedValue = new BindingExpression(
					value.slice(1),
					context,
					target,
					name)
			}
			else if(context.hasLiveText(value)){
				resolvedValue = new LiveTextValue(value, context)
			}
		}

		return resolvedValue
	}

	addGlobalProperties(context, child){
		for(let global of GLOBAL_PROPERTIES){
			let [name, attrName, value, coerceType] = global
			let propertyName = name+'Property'
			let liveValue = new LiveValue(value, name, child, coerceType)

			// Only add the global property if it doesn't exist yet (i.e. added
			// at the Widget level, rather than the Element level.

			if(!(propertyName in child)){
				if(!(name in child)){
					Object.defineProperty(
						child,
						name,
						{ get: () => liveValue.value
						, set: value => liveValue.value = value
						, enumerable: true
						})
				}
				else{
					// TODO: use resolveCompositeValue instead
					liveValue.value = child[name]
					liveValue.addEventListener('setvalue', () => child[name] = liveValue.value)
				}

				if(attrName){
					liveValue.addEventListener('setvalue', () => child[attrName] = liveValue.value)
				}

				Object.defineProperty(
					child,
					propertyName,
					{ value: liveValue
					, writable: false
					, enumerable: false
					})
			}
		}
	}

	bindDragAndDrop(child){
		if(child.draghandle || (child.widget && child.widget.draghandle)){
			let dragTarget = this.findContainerElement(child, 'dragtarget')
			
			child.addEventListener('dragstart', event => this.rawDragStart(dragTarget, event))
		}

		if(child.droptarget || (child.widget && child.widget.droptarget)){
			let dropContainer = this.findContainerElement(child, 'dropContainer')

			if(dropContainer.widget){
				child.addEventListener('drop', event => dropContainer.widget.rawDrop(event))
				child.addEventListener('dragover', event => dropContainer.widget.rawDragover(event))
			}
			if(child.widget){
				child.addEventListener('dragenter', event => child.widget.rawDragenter(event))
				child.addEventListener('dragleave', event => child.widget.rawDragleave(event))
				child.addEventListener('drop', event => child.widget.rawDragleave(event))
			}
		}
	}

	rawDragStart(dragTarget, event){
		let targetWidget = dragTarget.widget

		if(targetWidget){
			// TODO: conversion for dragging in/out of the browser?
			//event.dataTransfer.setData(targetWidget.dragdatatype || '', targetWidget.dragdata)
			window.currentApplication.setDragData(
				targetWidget.dragdata,
				targetWidget.dragdatatype || '')
		}

		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setDragImage(dragTarget, 0, 0)
	}

	bindAttributes(context, child){
		for(let attr of child.attributes){
			let name = attr.name /*in ATTRIBUTE_SUBSTITUTION
				? ATTRIBUTE_SUBSTITUTION[attr.name]
				: attr.name */
			let value = this.resolveCompositeValue(context, child, name, attr.value)
			let attrProperty = name+'Property'

			if(!(value instanceof BindingExpression)){
				if(attrProperty in child){
					child[attrProperty].value = value
				}
				else{
					if(isListenable(child[name]))
						child[name].value = value
					else
						child[name] = value
				}
			}
			else{
				attr.bindingExpression = value
			}
		}
	}

	async populateChild(child, context, rootName){
		let name = child.nodeName.toLowerCase()
		let newChild = child
		let key = child instanceof HTMLElement? child.getAttribute('key') : null

		if(name === '#text'){
			if(this.hasLiveText(child.textContent))
				new LiveText(child, context)
		}
		else if(this.hasSpecialWidget(child)){
			newChild = this.getSpecialWidget(child)
			if(newChild instanceof Promise)
				newChild = await newChild
		}
		else if(name in NO_RECURSE_TAG || name.startsWith('#')){
			console.log('Skipping element: '+name)
		}
		else if(name in BUILTIN_TAG || name === rootName){
			//console.log('Recursing into element: '+name)

			this.addGlobalProperties(context, child)
			this.bindAttributes(context, child)

			await this.populateChildren(context, child, rootName)
		}
		else{
			//console.log('Building widget: '+name)

			// maybe get this from the context
			let widget = await this.getWidget(name)

			await widget.bind(context, child)

			newChild = widget.root
		}

		if(key){
			this.children[key] = newChild
			context.children[key] = newChild
		}

		return newChild
	}

	async populateChildren(context, root, rootName){
		for(let child of root.childNodes){
			let newChild = await this.populateChild(child, context, rootName)

			if(newChild !== child){
				root.replaceChild(newChild, child)
			}

			this.bindDragAndDrop(newChild)
		}
	}

	async populate(context, root){
		root = root || this.root

		if(root.shadowRoot)
			root = root.shadowRoot

		await this.populateChildren(this, root, this.elementName)
	}
}
