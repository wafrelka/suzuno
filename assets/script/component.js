class PlainComponent {

	constructor(element) {
		this.element = element;
		this.classes = {};
	}

	get dataset() {
		return this.element.dataset;
	}
}

class TextComponent extends PlainComponent {

	constructor(element) {
		super(element);
		this._text = null;
	}

	get text() {
		return this._text;
	}

	set text(value) {
		if(value !== this._text) {
			this._text = value;
			this.element.textContent = value;
		}
	}
}

class LinkComponent extends PlainComponent {

	constructor(element) {
		super(element);
		this._href = null;
	}

	get href() {
		return this._href;
	}

	set href(value) {
		if(value !== this._href) {
			this._href = value;
			this.element.href = value;
		}
	}
}

class ImageComponent extends PlainComponent {

	constructor(element) {
		super(element);
		this._image_active = null;
		this._image_src = null;
		this._actual_src = null;
	}

	_update_element_src() {
		let completed = (this._actual_src === this._image_src && this.element.complete);
		let enabled = (this._image_active || completed);
		let src = enabled ? this._image_src : null;
		if(this._actual_src !== src) {
			this._actual_src = src;
			if(src === null) {
				this.element.src = "";
			} else {
				this.element.src = "";
				this.element.src = src;
			}
		}
	}

	set src(value) {
		if(this._image_src === value) {
			return;
		}
		this._image_src = value;
		this._update_element_src();
	}

	set active(value) {
		if(this._image_active === value) {
			return;
		}
		this._image_active = value;
		this._update_element_src();
	}

	get complete() {
		return this.element.complete;
	}
}

// fill `this.item_proto` with some concrete component type
class ComponentListTemplate extends PlainComponent {

	constructor(element) {

		super(element);

		let template_element = element.querySelector(":scope > template");
		this._template = template_element.content.firstElementChild;
		element.removeChild(template_element);

		this._list_components = [];
		this._list_unused_components = [];
	}

	resize(value) {

		let length = this._list_components.length;
		let added_count = value - length;
		let removed_count = length - value;

		for(let i = 0; i < added_count; i += 1) {
			let index = length + i;
			let comp = this._list_unused_components.pop();
			if(comp === undefined) {
				let elem = this._template.cloneNode(true);
				comp = new this.item_proto(elem);
			}
			comp.dataset.listIndex = index.toString();
			this.element.appendChild(comp.element);
			this._list_components.push(comp);
		}

		for(let i = 0; i < removed_count; i += 1) {
			let comp = this._list_components.pop();
			this.element.removeChild(comp.element);
			this._list_unused_components.push(comp);
		}
	}

	rotate_items(front_to_back) {
		if(front_to_back) {
			let item = this._list_components.shift();
			this._list_components.push(item);
			this.element.removeChild(item.element);
			this.element.appendChild(item.element);
		} else {
			let item = this._list_components.pop();
			this._list_components.unshift(item);
			this.element.removeChild(item.element);
			this.element.insertBefore(item.element, this.element.firstElementChild);
		}
		for(let i = 0; i < this._list_components.length; i += 1) {
			this._list_components[i].dataset.listIndex = i.toString();
		}
	}

	find_index(item_element) {
		let index = parseInt(item_element.dataset.listIndex);
		return index;
	}

	get items() {
		return this._list_components;
	}
}

function hint_select(hint, query) {
	if(hint === null) {
		return null;
	}
	return hint.querySelector(query);
}

function hint_select_template(hint) {
	let h = hint_select(hint, ":scope > template");
	if(h === null) {
		return h;
	}
	return h.content.firstElementChild;
}

/*
	params := {
		type: optional(string),
		classes: array(string),
		handlers: string -> fn,
		children: string -> query + params,
		items: params,
	}
*/

function define_component(params, hint) {

	let proto = null;

	if(params.children !== undefined) {

		let children = {};
		for(let [key, value] of Object.entries(params.children)) {
			let prop_hint = hint_select(hint, value.query);
			children[key] = {
				proto: define_component(value, prop_hint),
				query: value.query,
			};
		}

		proto = class extends PlainComponent {
			constructor(element) {
				super(element);
				for(let [key, value] of Object.entries(children)) {
					let e = this.element.querySelector(value.query);
					this[key] = new value.proto(e);
				}
			}
		};

	} else if(params.items !== undefined) {

		let template_hint = hint_select_template(hint);
		let item_proto = define_component(params.items, template_hint);

		proto = class extends ComponentListTemplate{};
		proto.prototype.item_proto = item_proto;

	} else if(params.static_items !== undefined) {

		let item_hint = (hint !== null) ? hint.firstElementChild : null;
		let item_proto = define_component(params.static_items, item_hint);

		proto = class extends PlainComponent {
			constructor(element) {
				super(element);
				this._list = [];
				for(let ch_elem of element.children) {
					let comp = new item_proto(ch_elem);
					this._list.push(comp);
				}
			}
			get static_items() {
				return this._list;
			}
		};

	} else if(hint !== null) {

		let tag = hint.tagName;

		if(tag == "IMG") {
			proto = class extends ImageComponent{};
		} else if(tag == "A") {
			proto = class extends LinkComponent{};
		} else if(hint.childElementCount > 0) {
			proto = class extends PlainComponent{};
		} else {
			proto = class extends TextComponent{};
		}

	} else {

		let type = params.type;

		if(type === "image") {
			proto = class extends ImageComponent{};
		} else if(type === "link") {
			proto = class extends LinkComponent{};
		} else if(type === "text") {
			proto = class extends TextComponent{};
		} else if(type === "plain") {
			proto = class extends PlainComponent{};
		} else {
			console.error("cannot construct component prototype", params, hint);
			throw "cannot construct component prototype";
		}
	}

	for(let class_name of (params.classes || [])) {
		let prop_name = class_name.replace("-", "_");
		let prop = {
			set: function(value) {
				if(this.classes[class_name] === value) {
					return;
				}
				this.classes[class_name] = value;
				if(value) {
					this.element.classList.add(class_name);
				} else {
					this.element.classList.remove(class_name);
				}
			},
		};
		Object.defineProperty(proto.prototype, prop_name, prop);
	}

	if(params.handlers !== undefined) {

		let proto_extended = class extends proto {
			constructor(element) {
				super(element);
				for(let [event_name, fn] of Object.entries(params.handlers)) {
					let c = this;
					this.element.addEventListener(event_name, (ev) => fn(ev, c));
				}
			}
		};
		proto = proto_extended;
	}

	return proto;
}

export function build_component(root, params) {
	let proto = define_component(params, root);
	let c = new proto(root);
	return c;
}
