export {LiveValue} from './events.js'
export {Widgy} from './base.js'
export {Widget} from './widget.js'
export {Application} from './application.js'
export {Model, LiveObject, LiveArray} from './model.js'
export {View, ArrayView} from './view.js'
export {RemoteStore, Dropbox} from './storage.js'

import {Widgy} from './base.js'
import {Application} from './application.js'

export async function preloadWidget(name, custom){
	await Widgy.getWidgetClass(name, custom)
}

export async function start(appClass, customWidgetBase){
	let html = document.firstElementChild
	let application

	if(customWidgetBase)
		Widgy.customWidgetBase = customWidgetBase

	if(appClass == undefined)
		appClass = Application

	application = new appClass()

	Application.currentApplication = application
	window.currentApplication = application

	await application.bind(application, html)

	await application.init()

	application.loadInitialPath()

	return application
}
