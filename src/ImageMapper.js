import React, { Component } from "react";
import PropTypes from "prop-types";
import isEqual from "react-fast-compare";

export default class ImageMapper extends Component {
	constructor(props) {
		super(props);
		[
			"drawrect",
			"drawcircle",
			"drawpoly",
			"initCanvases",
			"renderPrefilledAreas"
		].forEach(f => (this[f] = this[f].bind(this)));
		let absPos = { position: "absolute", top: 0, left: 0 };
		let canvas = { ...absPos, pointerEvents: "none" };
		this.styles = {
			container: { position: "relative" },
			hoverCanvas: { ...canvas, zIndex: 3 },
			prefillCanvas: { ...canvas, zIndex: 2 },
			img: { ...absPos, zIndex: 1, userSelect: "none" },
			map: (props.onClick && { cursor: "pointer" }) || undefined
		};
		// Props watched for changes to trigger update
		this.watchedProps = [
			"active",
			"fillColor",
			"height",
			"imgWidth",
			"lineWidth",
			"src",
			"strokeColor",
			"width",
			"renderChildren"
		];
	}

	shouldComponentUpdate(nextProps) {
		const propChanged = this.watchedProps.some(
			prop => this.props[prop] !== nextProps[prop]
		);
		const result = !isEqual(this.props.map, this.state.map) || propChanged;
		return result;
	}

	UNSAFE_componentWillMount() {
		this.updateCacheMap();
	}

	updateCacheMap() {
		this.setState(
			{ map: Object.assign({}, this.props.map) },
			this.initCanvases
		);
	}

	componentDidUpdate() {
		this.updateCacheMap();
		this.initCanvases();
	}

	drawrect(coords, fillColor, lineWidth, strokeColor, context) {
		let [left, top, right, bot] = coords;
		context.fillStyle = fillColor;
		context.lineWidth = lineWidth;
		context.strokeStyle = strokeColor;
		context.strokeRect(left, top, right - left, bot - top);
		context.fillRect(left, top, right - left, bot - top);
		context.fillStyle = this.props.fillColor;
	}

	drawcircle(coords, fillColor, lineWidth, strokeColor, context) {
		context.fillStyle = fillColor;
		context.beginPath();
		context.lineWidth = lineWidth;
		context.strokeStyle = strokeColor;
		context.arc(coords[0], coords[1], coords[2], 0, 2 * Math.PI);
		context.closePath();
		context.stroke();
		context.fill();
		context.fillStyle = this.props.fillColor;
	}

	drawpoly(coords, fillColor, lineWidth, strokeColor, context) {
		coords = coords.map(coord => Math.floor(coord));
		coords = coords.reduce(
			(a, v, i, s) => (i % 2 ? a : [...a, s.slice(i, i + 2)]),
			[]
		);
		
		context.fillStyle = fillColor;
		context.beginPath();
		context.lineWidth = lineWidth;
		context.strokeStyle = strokeColor;
		let first = coords.unshift();
		context.moveTo(first[0], first[1]);
		coords.forEach(c => context.lineTo(c[0], c[1]));
		context.closePath();
		context.stroke();
		context.fill();
		context.fillStyle = this.props.fillColor;
	}

	initCanvases() {
		if (this.props.width) this.img.width = this.props.width;

		if (this.props.height) this.img.height = this.props.height;

		this.prefillCanvas.width = this.props.width || this.img.clientWidth;
		this.prefillCanvas.height = this.props.height || this.img.clientHeight;
		this.hoverCanvas.width = this.props.width || this.img.clientWidth;
		this.hoverCanvas.height = this.props.height || this.img.clientHeight;
		this.container.style.width =
			(this.props.width || this.img.clientWidth) + "px";
		this.container.style.height =
			(this.props.height || this.img.clientHeight) + "px";
		this.prefillCtx = this.prefillCanvas.getContext("2d");
		this.prefillCtx.fillStyle = this.props.fillColor;
		this.hoverCtx = this.hoverCanvas.getContext("2d");
		this.hoverCtx.fillStyle = this.props.fillColor;
		//this.prefillCtx.strokeStyle = this.props.strokeColor;

		if (this.props.onLoad) this.props.onLoad();

		this.renderPrefilledAreas();
	}

	hoverOn(area, index, event) {
		const shape = event.target.getAttribute("shape");

		if (this.props.active && this["draw" + shape]) {
			this["draw" + shape](
				event.target.getAttribute("coords").split(","),
				area.fillColor,
				area.lineWidth || this.props.lineWidth,
				area.strokeColor || this.props.strokeColor,
				this.hoverCtx
			);
		}
		
		if (this.props.onMouseEnter) this.props.onMouseEnter(area, index, event);
	}

	hoverOff(area, index, event) {
		if (this.props.active) this.hoverCtx.clearRect(0, 0, this.hoverCanvas.width, this.hoverCanvas.height);

		if (this.props.onMouseLeave) this.props.onMouseLeave(area, index, event);
	}

	click(area, index, event) {
		if (this.props.onClick) {
			event.preventDefault();
			this.props.onClick(area, index, event);
		}
	}

	imageClick(event) {
		if (this.props.onImageClick) {
			event.preventDefault();
			this.props.onImageClick(event);
		}
	}

	mouseMove(area, index, event) {
		if (this.props.onMouseMove) {
			this.props.onMouseMove(area, index, event);
		}
	}

	mouseDown(area, index, event) {
		if (this.props.onMouseDown) {
			this.props.onMouseDown(area, index, event);
		}
	}

	mouseUp(area, index, event) {
		if (this.props.onMouseUp) {
			this.props.onMouseUp(area, index, event);
		}
	}

	imageMouseMove(area, index, event) {
		if (this.props.onImageMouseMove) {
			this.props.onImageMouseMove(area, index, event);
		}
	}
	
	imageMouseDown(area, index, event) {
		if (this.props.onImageMouseDown) {
			this.props.onImageMouseDown(area, index, event);
		}
	}
	
	imageMouseUp(area, index, event) {
		if (this.props.onImageMouseUp) {
			this.props.onImageMouseUp(area, index, event);
		}
	}

	scaleCoords(coords) {
		const { imgWidth, width } = this.props;
		// calculate scale based on current 'width' and the original 'imgWidth'
		const scale = width && imgWidth && imgWidth > 0 ? width / imgWidth : 1;
		return coords.map(coord => coord * scale);
	}

	renderPrefilledAreas() {
		this.state.map.areas.map(area => {
			if (!area.preFillColor) return;
			this["draw" + area.shape](
				this.scaleCoords(area.coords),
				area.preFillColor,
				area.lineWidth || this.props.lineWidth,
				area.strokeColor || this.props.strokeColor,
				this.prefillCtx
			);
		});
	}

	computeCenter(area) {
		if (!area) return [0, 0];

		const scaledCoords = this.scaleCoords(area.coords);

		switch (area.shape) {
			case "circle":
				return [scaledCoords[0], scaledCoords[1]];
			case "poly":
			case "rect":
			default: {
				// Calculate centroid
				const n = scaledCoords.length / 2;
				const { y, x } = scaledCoords.reduce(
					({ y, x }, val, idx) => {
						return !(idx % 2) ? { y, x: x + val / n } : { y: y + val / n, x };
					},
					{ y: 0, x: 0 }
				);
				return [x, y];
			}
		}
	}

	renderAreas() {
		return this.state.map.areas.map((area, index) => {
			const scaledCoords = this.scaleCoords(area.coords);
			const center = this.computeCenter(area);
			const extendedArea = { ...area, scaledCoords, center };
			return (
				<area
					key={area._id || index}
					shape={area.shape}
					coords={scaledCoords.join(",")}
					onMouseEnter={this.hoverOn.bind(this, extendedArea, index)}
					onMouseLeave={this.hoverOff.bind(this, extendedArea, index)}
					onMouseMove={this.mouseMove.bind(this, extendedArea, index)}
					onMouseDown={this.mouseDown.bind(this, extendedArea, index)}
					onMouseUp={this.mouseUp.bind(this, extendedArea, index)}
					onClick={this.click.bind(this, extendedArea, index)}
					href={area.href}
				/>
			);
		});
	}
	
	renderChildren() {
		if (this.props.renderChildren) {
			return this.props.renderChildren();
		}
		return null;
	};

	render() {
		return (
			<div style={this.styles.container} ref={node => (this.container = node)}>
				<img
					style={this.styles.img}
					src={this.props.src}
					useMap={`#${this.state.map.name}`}
					alt=""
					ref={node => (this.img = node)}
					onLoad={this.initCanvases}
					onClick={this.imageClick.bind(this)}
					onMouseMove={this.imageMouseMove.bind(this)}
					onMouseDown={this.imageMouseDown.bind(this)}
					onMouseUp={this.imageMouseUp.bind(this)}
				/>
				<canvas id="hover-layer" ref={node => (this.hoverCanvas = node)} style={this.styles.hoverCanvas} />
				<canvas id="prefill-layer" ref={node => (this.prefillCanvas = node)} style={this.styles.prefillCanvas} />
				<map name={this.state.map.name} style={this.styles.map}>
					{this.renderAreas()}
				</map>
				{this.renderChildren()}
			</div>
		);
	}
}

ImageMapper.defaultProps = {
	active: true,
	fillColor: "rgba(255, 255, 255, 0.5)",
	lineWidth: 1,
	map: {
		areas: [],
		name: "image-map-" + Math.random()
	},
	strokeColor: "rgba(0, 0, 0, 0.5)"
};

ImageMapper.propTypes = {
	active: PropTypes.bool,
	fillColor: PropTypes.string,
	height: PropTypes.number,
	imgWidth: PropTypes.number,
	lineWidth: PropTypes.number,
	src: PropTypes.string.isRequired,
	strokeColor: PropTypes.string,
	width: PropTypes.number,
	renderChildren: PropTypes.func,

	onClick: PropTypes.func,
	onMouseMove: PropTypes.func,
	onMouseDown: PropTypes.func,
	onMouseUp: PropTypes.func,
	onImageClick: PropTypes.func,
	onImageMouseMove: PropTypes.func,
	onImageMouseDown: PropTypes.func,
	onImageMouseUp: PropTypes.func,
	onLoad: PropTypes.func,
	onMouseEnter: PropTypes.func,
	onMouseLeave: PropTypes.func,

	map: PropTypes.shape({
		areas: PropTypes.arrayOf(
			PropTypes.shape({
				area: PropTypes.shape({
					coords: PropTypes.arrayOf(PropTypes.number),
					href: PropTypes.string,
					shape: PropTypes.string,
					preFillColor: PropTypes.string,
					fillColor: PropTypes.string
				})
			})
		),
		name: PropTypes.string
	})
};
