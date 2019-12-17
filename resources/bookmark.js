import { splitN } from "./util.js";

function set_default(map, key, value) {
	if(map.has(key)) {
		return;
	}
	map.set(key, value);
}

class Table {

	constructor() {
		this._key_to_value = new Map();
		this._value_to_key = new Map();
	}

	set(key, value) {
		set_default(this._key_to_value, key, new Set());
		set_default(this._value_to_key, value.id, new Set());
		this._key_to_value.get(key).add(value);
		this._value_to_key.get(value.id).add(key);
	}

	unset(key, value) {
		set_default(this._key_to_value, key, new Set());
		set_default(this._value_to_key, value.id, new Set());
		this._key_to_value.get(key).delete(value);
		this._value_to_key.get(value.id).delete(key);
	}

	values(key) {
		set_default(this._key_to_value, key, new Set());
		return this._key_to_value.get(key);
	}

	keys(value) {
		set_default(this._value_to_key, value.id, new Set());
		return this._value_to_key.get(value.id);
	}
}

class BookmarkList {

	constructor(local_storage) {

		this._storage = local_storage;
		this._name_to_tags = new Map();
		this._tag_table = new Table();

		let length = this._storage.length;

		for(let i = 0; i < length; i += 1) {

			let key = this._storage.key(i);
			let value = this._storage.getItem(key);

			let key_kind_content = splitN(key, ":", 2);
			if(key_kind_content.length !== 2) {
				continue;
			}
			let kind = key_kind_content[0];
			let content = key_kind_content[1];

			if(kind === "bookmark") {

				let key_tag_path = splitN(content, ":", 2);
				if(key_tag_path.length !== 2) {
					continue;
				}
				let tag = key_tag_path[0];
				let path = key_tag_path[1];
				let num = value;

				this._tag_table.set(tag, { id: path, num: num });

			} else if(kind === "tag") {

				let tag = content;
				let value_main_name = splitN(value, ":", 2);
				if(value_main_name.length !== 2) {
					continue;
				}
				let main = value_main_name[0] === "main";
				let name = value_main_name[1];

				this._name_to_tags.set(name, { id: tag, main: main });
			}
		}
	}

	set_tag(path, tag_id, num) {
		this._tag_table.set(tag_id, { id: path, num: num });
		let key = `bookmark:${tag_id}:${path}`;
		let value = `${num}`;
		this._storage.setItem(key, value);
	}

	unset_tag(path, tag_id) {
		this._tag_table.unset(tag_id, { id: path });
		let key = `bookmark:${tag_id}:${path}`;
		this._storage.removeItem(key);
	}

	get_tags(path) {
		return Array.from(this._tag_table.keys({ id: path }));
	}

	items(tag_id) {
		let it = this._tag_table.values(tag_id);
		return Array.from(it, (v) => ({ path: v.id, num: v.num }));
	}

	tags() {
		let it = this._name_to_tags.entries();
		return Array.from(it, (v) => ({ name: v[0], id: v[1].id, main: v[1].main }));
	}

	find_tag(name) {
		return this._name_to_tags.get(name);
	}
}

export { BookmarkList }
