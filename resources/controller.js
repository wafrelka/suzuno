import { get_directory_url, get_parent_url, get_canonical_list_url } from "./url.js";
import { fetch_json } from "./util.js";

function add_link(base_url, resource) {
	if(resource.type == "directory") {
		return {
			link: get_directory_url(base_url, resource.name),
			...resource
		};
	} else {
		return resource;
	}
}

function fetch_resources(url) {

	let url_path = new URL(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		return fetch_json(`/meta/directory${res_path}`);
	}

	throw `unsupported resource url: ${url}`;
}

function get_resource_title(url) {

	let url_path = new URL(url).pathname;

	if(url_path.startsWith("/view/")) {
		let res_path = url_path.replace(/^\/view/, "");
		return res_path;
	}

	throw `unsupported resource url: ${url}`;
}

class Controller {

	constructor(list, navi) {

		this._list = list;
		this._navi = navi;

		this._on_push_state = () => {};

		this._current = {
			location: null,
			resources: null,
		};

		this._list.on_file_selected = (url) => {
			console.log(`selected: file ${url}`);
		};
		this._list.on_directory_selected = (url) => {
			this.refresh_with(url);
		};
		this._navi.on_back_requested = (url) => {
			this.refresh_with(url);
		};
	}

	set on_push_state(fn) {
		this._on_push_state = fn;
	}

	async _request_resources_update(location) {
		try {
			let resp = await fetch_resources(location);
			let resources = resp.resources.map((r) => add_link(location, r));
			this._update(undefined, resources);
		} catch(err) {
			this._list.set_error_message(`failed to load: ${err}`);
		}
	}

	_update(location = undefined, resources = undefined) {

		let prev = this._current;
		this._current = {
			location: new URL(location === undefined ? prev.location : location),
			resources: resources === undefined ? prev.resources : resources,
		};

		let prev_list_url = (prev.location !== null ? get_canonical_list_url(prev.location) : null);
		let cur_list_url = get_canonical_list_url(this._current.location);

		if(prev_list_url === null || prev_list_url.pathname !== cur_list_url.pathname) {

			this._current.resources = null;
			this._list.reset();
			this._request_resources_update(this._current.location);

		} else if(resources !== undefined) {

			this._list.update(resources);
		}

		this._navi.update_back_link(get_parent_url(this._current.location));
		this._navi.update_title("", get_resource_title(this._current.location), "");
	}

	refresh_with(location, replacing = false) {
		this._update(location);
		this._on_push_state(location, null, replacing);
	}

	rewrite_with(location) {
		this._update(location);
	}
}

export { Controller }
