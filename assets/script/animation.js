class AnimationDebouncer {

	constructor(fn) {
		this._fn = fn;
		this._requests = [];
	}

	_add_request(param, queueing) {

		let empty = (this._requests.length === 0);

		while(!queueing && this._requests.length > 0) {
			this._requests.pop();
		}
		this._requests.push(param);

		if(empty) {
			window.requestAnimationFrame(this._process_request.bind(this));
		}
	}

	_process_request() {

		let param = this._requests.shift();

		this._fn(param);

		if(this._requests.length > 0) {
			window.requestAnimationFrame(this._process_request.bind(this));
		}
	}

	push(param) {
		this._add_request(param, true);
	}

	write(param) {
		this._add_request(param, false);
	}
}

function request_after_redraw(fn) {
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(fn);
	});
}

export { AnimationDebouncer, request_after_redraw }
