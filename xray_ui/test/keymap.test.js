const assert = require("assert");
const propTypes = require("prop-types");
const React = require("react");
const { mount } = require("./helpers/component_helpers");
const $ = React.createElement;
const {
  KeymapProvider,
  ActionContext,
  Action,
  keystrokeStringForEvent
} = require("../lib/keymap");

suite("Keymap", () => {
  test("dispatching an action via a keystroke", () => {
    class Component extends React.Component {
      render() {
        return $(
          KeymapProvider,
          { keyBindings: this.props.keyBindings },
          $(
            "div",
            null,
            $(
              ActionContext,
              { add: ["a", "b"] },
              $(Action, { type: "Action1" }),
              $(Action, { type: "Action2" }),
              $(Action, { type: "Action3" }),
              $(
                "div",
                null,
                $(
                  ActionContext,
                  { add: ["c"], remove: ["a"] },
                  $(Action, { type: "Action4" }),
                  $("div", { id: "target" })
                )
              )
            )
          )
        );
      }
    }

    let dispatchedActions;
    const keyBindings = [
      { key: "ctrl-a", context: "a b", action: "Action1" },
      { key: "ctrl-a", context: "b c", action: "Action4" },
      { key: "ctrl-b", context: "a b", action: "Action2" },
      { key: "ctrl-c", context: "a b", action: "UnregisteredAction" }
    ];
    const component = mount($(Component, { keyBindings }), {
      context: {
        dispatchAction: action => dispatchedActions.push(action.type)
      },
      childContextTypes: { dispatchAction: propTypes.func }
    });
    const target = component.find("#target");

    // Dispatch action when finding the first context/keybinding that match the event...
    dispatchedActions = [];
    target.simulate("keyDown", { ctrlKey: true, key: "a" });
    assert.deepEqual(dispatchedActions, ["Action4"]);

    // ...and walk up the DOM until a matching context is found.
    dispatchedActions = [];
    target.simulate("keyDown", { ctrlKey: true, key: "b" });
    assert.deepEqual(dispatchedActions, ["Action2"]);

    // Override a previous keybinding by specifying it later in the list.
    dispatchedActions = [];
    keyBindings.push({ key: "ctrl-b", context: "a b", action: "Action3" });
    target.simulate("keyDown", { ctrlKey: true, key: "b" });
    assert.deepEqual(dispatchedActions, ["Action3"]);

    // Simulate a keystroke that matches a context/keybinding but that maps to an unknown action.
    dispatchedActions = [];
    target.simulate("keyDown", { ctrlKey: true, key: "c" });
    assert.deepEqual(dispatchedActions, []);
  });

  test("keystrokeStringForEvent", () => {
    assert.equal(
      keystrokeStringForEvent({ ctrlKey: true, key: "s" }),
      "ctrl-s"
    );
    assert.equal(
      keystrokeStringForEvent({ ctrlKey: true, altKey: true, key: "s" }),
      "ctrl-alt-s"
    );
    assert.equal(
      keystrokeStringForEvent({
        ctrlKey: true,
        altKey: true,
        metaKey: true,
        key: "s"
      }),
      "ctrl-alt-cmd-s"
    );
    assert.equal(
      keystrokeStringForEvent({
        ctrlKey: true,
        altKey: true,
        metaKey: true,
        shiftKey: true,
        key: "s"
      }),
      "ctrl-alt-shift-cmd-s"
    );
  });
});
