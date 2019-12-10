import { get_directory_url, get_page_url, get_list_url, get_parent_url, get_canonical_list_url, pick_page } from "./url.js";
import { fetch_json } from "./util.js";

function format_resources_data(base_url, resources) {

	let formatted = [];
	let file_count = 0;

	for(let res of resources) {

		if(res.type == "directory") {
			formatted.push({
				link: get_directory_url(base_url, res.name),
				...res
			});
		} else if(res.type == "file") {
			formatted.push({
				link: get_page_url(base_url, file_count),
				...res
			});
			file_count += 1;
		} else {
			formatted.push(res);
		}
	}

	return formatted;
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

	constructor(list, navi, pager) {

		this._list = list;
		this._navi = navi;
		this._pager = pager;
		this._in_pager = false;

		this._on_push_state = () => {};

		this._current = {
			location: null,
			resources: null,
		};

		this._list.on_file_selected = (url) => {
			this.refresh_with(url);
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
			this._update(undefined, resp.resources);
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

			let formatted = format_resources_data(this._current.location, resources);
			this._list.update(formatted);
			this._pager.update(formatted);
		}

		let p = pick_page(this._current.location);
		if(p !== null) {
			if(this._current.resources !== null) {
				this._pager.change_page(p);
			}
			this._pager.activate();
			this._list.deactivate_partial_thumbnails();
			this._in_pager = true;
		} else {
			this._pager.deactivate();
			this._list.activate_thumbnails();
			this._in_pager = false;
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

	get in_pager() {
		return this._in_pager;
	}

	_move_page(diff) {
		if(this._current.resources === null) {
			return;
		}
		let p = pick_page(this._current.location);
		if(p !== null && p + diff >= 0 && p + diff < this._current.resources.length) {
			this.refresh_with(get_page_url(this._current.location, p + diff));
		}
	}

	move_to_next_page() {
		this._move_page(+1);
	}

	move_to_prev_page() {
		this._move_page(-1);
	}

	switch_to_list() {
		this.refresh_with(get_list_url(this._current.location));
	}
}

export { Controller }
