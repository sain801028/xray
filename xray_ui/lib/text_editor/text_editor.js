const React = require("react");
const ReactDOM = require("react-dom");
const PropTypes = require("prop-types");
const { styled } = require("styletron-react");
const TextPlane = require("./text_plane");
const debounce = require("../debounce");
const $ = React.createElement;

const CURSOR_BLINK_RESUME_DELAY = 300;
const CURSOR_BLINK_PERIOD = 800;

const Root = styled("div", {
  width: "100%",
  height: "100%",
  overflow: "hidden"
});

class TextEditor extends React.Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    let derivedState = null;

    if (nextProps.width != null && nextProps.width !== prevState.width) {
      derivedState = { width: nextProps.width };
    }

    if (nextProps.height != null && nextProps.height !== prevState.height) {
      if (derivedState) {
        derivedState.height = nextProps.height;
      } else {
        derivedState = { height: nextProps.height };
      }
    }

    return derivedState;
  }

  constructor(props) {
    super(props);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.debouncedStartCursorBlinking = debounce(
      this.startCursorBlinking.bind(this),
      CURSOR_BLINK_RESUME_DELAY
    );

    this.state = { showLocalCursors: true };
  }

  componentDidMount() {
    const element = ReactDOM.findDOMNode(this);
    this.resizeObserver = new ResizeObserver(([{ contentRect }]) => {
      this.componentDidResize({
        width: contentRect.width,
        height: contentRect.height
      });
    });
    this.resizeObserver.observe(element);

    if (this.props.width == null || this.props.height == null) {
      const dimensions = {
        width: element.offsetWidth,
        height: element.offsetHeight
      };
      this.componentDidResize(dimensions);
      this.setState(dimensions);
    }

    element.addEventListener("wheel", this.handleMouseWheel, { passive: true });

    this.startCursorBlinking();
  }

  componentWillUnmount() {
    this.stopCursorBlinking();
    const element = ReactDOM.findDOMNode(this);
    element.removeEventListener("wheel", this.handleMouseWheel, {
      passive: true
    });
    this.resizeObserver.disconnect();
  }

  componentDidResize(measurements) {
    this.props.dispatch({
      type: "SetDimensions",
      width: measurements.width,
      height: measurements.height
    });
  }

  render() {
    return $(
      Root,
      {
        tabIndex: -1,
        onKeyDown: this.handleKeyDown,
        $ref: element => {
          this.element = element;
        }
      },
      $(TextPlane, {
        showLocalCursors: this.state.showLocalCursors,
        lineHeight: this.props.line_height,
        scrollTop: this.props.scroll_top,
        paddingLeft: 5,
        height: this.props.height,
        width: this.props.width,
        selections: this.props.selections,
        firstVisibleRow: this.props.first_visible_row,
        lines: this.props.lines,
      })
    );
  }

  handleMouseWheel(event) {
    this.props.dispatch({ type: "UpdateScrollTop", delta: event.deltaY });
  }

  handleKeyDown(event) {
    if (event.key.length === 1 && !event.metaKey) {
      this.props.dispatch({ type: "Edit", text: event.key });
      return;
    } else if (event.key === 'Enter') {
      this.props.dispatch({type: 'Edit', text: '\n'});
      return;
    }

    const action = actionForKeyDownEvent(event);
    if (action) {
      this.pauseCursorBlinking();
      this.props.dispatch({ type: action });
    }
  }

  pauseCursorBlinking() {
    this.stopCursorBlinking();
    this.debouncedStartCursorBlinking();
  }

  stopCursorBlinking() {
    if (this.state.cursorsBlinking) {
      window.clearInterval(this.cursorBlinkIntervalHandle);
      this.cursorBlinkIntervalHandle = null;
      this.setState({
        showLocalCursors: true,
        cursorsBlinking: false
      });
    }
  }

  startCursorBlinking() {
    if (!this.state.cursorsBlinking) {
      this.cursorBlinkIntervalHandle = window.setInterval(() => {
        this.setState({ showLocalCursors: !this.state.showLocalCursors });
      }, CURSOR_BLINK_PERIOD / 2);

      this.setState({
        cursorsBlinking: true,
        showLocalCursors: false
      });
    }
  }

  focus() {
    this.element.focus();
  }
}

function actionForKeyDownEvent(event) {
  switch (event.key) {
    case "ArrowUp":
      if (event.ctrlKey && event.shiftKey) {
        return "AddSelectionAbove";
      } else if (event.shiftKey) {
        return "SelectUp";
      } else {
        return "MoveUp";
      }
    case "ArrowDown":
      if (event.ctrlKey && event.shiftKey) {
        return "AddSelectionBelow";
      } else if (event.shiftKey) {
        return "SelectDown";
      } else {
        return "MoveDown";
      }
    case "ArrowLeft":
      return event.shiftKey ? "SelectLeft" : "MoveLeft";
    case "ArrowRight":
      return event.shiftKey ? "SelectRight" : "MoveRight";
    case "Backspace":
      return "Backspace";
    case "Delete":
      return "Delete";
  }
}

TextEditor.contextTypes = {
  theme: PropTypes.object
};

module.exports = TextEditor;
