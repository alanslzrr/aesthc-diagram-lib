// src/validation/structural.js
var structural_default = validate10;
var schema15 = { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." }, "band": { "type": "number" } }, "required": ["band", "description", "id", "label"], "additionalProperties": false, "description": "Band-layout nodes additionally declare which column they belong to." };
var schema16 = { "type": "string", "enum": ["primary", "secondary", "muted"], "description": "Visual weight of a node card." };
var schema17 = { "type": "string", "enum": ["card", "state", "table", "event", "terminal", "bar"], "description": "How a node is drawn: hairline card (default), state pill, ER table, timeline event, terminal, activation bar." };
var schema18 = { "type": "string", "enum": ["start", "end", "middle"], "description": "For `event` shapes, where the label sits relative to the dot." };
var schema19 = { "type": "object", "properties": { "name": { "type": "string" }, "type": { "type": "string", "description": "Optional column type, e.g. `uuid`, `varchar(64)`." }, "key": { "type": "string", "enum": ["pk", "fk", "unique"], "description": "Row badge: primary key / foreign key / unique." } }, "required": ["name"], "additionalProperties": false, "description": "A single row in an ER table node." };
var func2 = Object.prototype.hasOwnProperty;
function validate13(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.band === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "band" }, message: "must have required property 'band'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.description === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.id === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema15.properties, key0)) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err5 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err7 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err8 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err9 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data5 = data.weight;
      if (typeof data5 !== "string") {
        const err10 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (!(data5 === "primary" || data5 === "secondary" || data5 === "muted")) {
        const err11 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema16.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.nudge !== void 0) {
      if (!(typeof data.nudge == "number")) {
        const err12 = { instancePath: instancePath + "/nudge", schemaPath: "#/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.shape !== void 0) {
      let data7 = data.shape;
      if (typeof data7 !== "string") {
        const err13 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      if (!(data7 === "card" || data7 === "state" || data7 === "table" || data7 === "event" || data7 === "terminal" || data7 === "bar")) {
        const err14 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema17.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.textAnchor !== void 0) {
      let data8 = data.textAnchor;
      if (typeof data8 !== "string") {
        const err15 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      if (!(data8 === "start" || data8 === "end" || data8 === "middle")) {
        const err16 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema18.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data9 = data.fields;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data10 = data9[i0];
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.name === void 0) {
              const err17 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            for (const key1 in data10) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err18 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data10.name !== void 0) {
              if (typeof data10.name !== "string") {
                const err19 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data10.type !== void 0) {
              if (typeof data10.type !== "string") {
                const err20 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data10.key !== void 0) {
              let data13 = data10.key;
              if (typeof data13 !== "string") {
                const err21 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
              if (!(data13 === "pk" || data13 === "fk" || data13 === "unique")) {
                const err22 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema19.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err22];
                } else {
                  vErrors.push(err22);
                }
                errors++;
              }
            }
          } else {
            const err23 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
        }
      } else {
        const err24 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err25 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err26 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
    if (data.band !== void 0) {
      if (!(typeof data.band == "number")) {
        const err27 = { instancePath: instancePath + "/band", schemaPath: "#/properties/band/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
    }
  } else {
    const err28 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err28];
    } else {
      vErrors.push(err28);
    }
    errors++;
  }
  validate13.errors = vErrors;
  return errors === 0;
}
var schema21 = { "type": "string", "enum": ["main", "branch"], "description": "Edge flavour: cobalt main path vs amber branch path." };
var schema22 = { "type": "string", "enum": ["above-target", "below-target", "left-of-edge", "right-of-edge"] };
var schema23 = { "type": "string", "enum": ["above", "below"] };
function validate15(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed" || key0 === "labelPlacement" || key0 === "route")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.labelPlacement !== void 0) {
      let data6 = data.labelPlacement;
      if (typeof data6 !== "string") {
        const err10 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/definitions/EdgeLabelPlacement/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (!(data6 === "above-target" || data6 === "below-target" || data6 === "left-of-edge" || data6 === "right-of-edge")) {
        const err11 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/definitions/EdgeLabelPlacement/enum", keyword: "enum", params: { allowedValues: schema22.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.route !== void 0) {
      let data7 = data.route;
      if (data7 && typeof data7 == "object" && !Array.isArray(data7)) {
        if (data7.lane === void 0) {
          const err12 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/required", keyword: "required", params: { missingProperty: "lane" }, message: "must have required property 'lane'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        for (const key1 in data7) {
          if (!(key1 === "lane" || key1 === "clearance")) {
            const err13 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data7.lane !== void 0) {
          let data8 = data7.lane;
          if (typeof data8 !== "string") {
            const err14 = { instancePath: instancePath + "/route/lane", schemaPath: "#/definitions/EdgeLane/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
          if (!(data8 === "above" || data8 === "below")) {
            const err15 = { instancePath: instancePath + "/route/lane", schemaPath: "#/definitions/EdgeLane/enum", keyword: "enum", params: { allowedValues: schema23.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data7.clearance !== void 0) {
          if (!(typeof data7.clearance == "number")) {
            const err16 = { instancePath: instancePath + "/route/clearance", schemaPath: "#/properties/route/properties/clearance/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
  } else {
    const err18 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err18];
    } else {
      vErrors.push(err18);
    }
    errors++;
  }
  validate15.errors = vErrors;
  return errors === 0;
}
var schema25 = { "type": "object", "properties": { "id": { "type": "string" }, "from": { "type": "string" }, "label": { "type": "string" }, "destination": { "type": "string" }, "side": { "$ref": "#/definitions/ContinuationSide" }, "anchor": { "$ref": "#/definitions/ContinuationAnchor" }, "labelPlacement": { "type": "string", "enum": ["above-source", "below-source"] }, "variant": { "$ref": "#/definitions/EdgeVariant" }, "ariaLabel": { "type": "string", "description": "Spoken text when the compact visible label needs clearer return semantics." } }, "required": ["id", "from", "label", "destination", "side", "labelPlacement"], "additionalProperties": false, "description": "A source-only, off-canvas continuation. It preserves return/feedback semantics without adding a long relation to the graph or enclosing the diagram in a rail." };
var schema26 = { "type": "string", "enum": ["left", "right"] };
var schema27 = { "type": "string", "enum": ["upper", "center", "lower"] };
function validate17(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.from === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.destination === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "destination" }, message: "must have required property 'destination'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.side === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "side" }, message: "must have required property 'side'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.labelPlacement === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "labelPlacement" }, message: "must have required property 'labelPlacement'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema25.properties, key0)) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err7 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err8 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err9 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.destination !== void 0) {
      if (typeof data.destination !== "string") {
        const err10 = { instancePath: instancePath + "/destination", schemaPath: "#/properties/destination/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.side !== void 0) {
      let data4 = data.side;
      if (typeof data4 !== "string") {
        const err11 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/ContinuationSide/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (!(data4 === "left" || data4 === "right")) {
        const err12 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/ContinuationSide/enum", keyword: "enum", params: { allowedValues: schema26.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.anchor !== void 0) {
      let data5 = data.anchor;
      if (typeof data5 !== "string") {
        const err13 = { instancePath: instancePath + "/anchor", schemaPath: "#/definitions/ContinuationAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      if (!(data5 === "upper" || data5 === "center" || data5 === "lower")) {
        const err14 = { instancePath: instancePath + "/anchor", schemaPath: "#/definitions/ContinuationAnchor/enum", keyword: "enum", params: { allowedValues: schema27.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.labelPlacement !== void 0) {
      let data6 = data.labelPlacement;
      if (typeof data6 !== "string") {
        const err15 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/properties/labelPlacement/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      if (!(data6 === "above-source" || data6 === "below-source")) {
        const err16 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/properties/labelPlacement/enum", keyword: "enum", params: { allowedValues: schema25.properties.labelPlacement.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data7 = data.variant;
      if (typeof data7 !== "string") {
        const err17 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
      if (!(data7 === "main" || data7 === "branch")) {
        const err18 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.ariaLabel !== void 0) {
      if (typeof data.ariaLabel !== "string") {
        const err19 = { instancePath: instancePath + "/ariaLabel", schemaPath: "#/properties/ariaLabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
  } else {
    const err20 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err20];
    } else {
      vErrors.push(err20);
    }
    errors++;
  }
  validate17.errors = vErrors;
  return errors === 0;
}
function validate12(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.bands === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "bands" }, message: "must have required property 'bands'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "bands" || key0 === "nodes" || key0 === "edges" || key0 === "decisions" || key0 === "continuations")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if ("band" !== data0) {
        const err8 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "band" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err9 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err12 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err13 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err14 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.bands !== void 0) {
      let data5 = data.bands;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.title === void 0) {
              const err16 = { instancePath: instancePath + "/bands/" + i0, schemaPath: "#/definitions/DiagramBand/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key2 in data6) {
              if (!(key2 === "title")) {
                const err17 = { instancePath: instancePath + "/bands/" + i0, schemaPath: "#/definitions/DiagramBand/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data6.title !== void 0) {
              if (typeof data6.title !== "string") {
                const err18 = { instancePath: instancePath + "/bands/" + i0 + "/title", schemaPath: "#/definitions/DiagramBand/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
          } else {
            const err19 = { instancePath: instancePath + "/bands/" + i0, schemaPath: "#/definitions/DiagramBand/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
      } else {
        const err20 = { instancePath: instancePath + "/bands", schemaPath: "#/properties/bands/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data8 = data.nodes;
      if (Array.isArray(data8)) {
        const len1 = data8.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate13(data8[i1], { instancePath: instancePath + "/nodes/" + i1, parentData: data8, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data10 = data.edges;
      if (Array.isArray(data10)) {
        const len2 = data10.length;
        for (let i2 = 0; i2 < len2; i2++) {
          if (!validate15(data10[i2], { instancePath: instancePath + "/edges/" + i2, parentData: data10, parentDataProperty: i2, rootData })) {
            vErrors = vErrors === null ? validate15.errors : vErrors.concat(validate15.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err22 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.decisions !== void 0) {
      let data12 = data.decisions;
      if (Array.isArray(data12)) {
        const len3 = data12.length;
        for (let i3 = 0; i3 < len3; i3++) {
          let data13 = data12[i3];
          if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
            if (data13.id === void 0) {
              const err23 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data13.source === void 0) {
              const err24 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data13.label === void 0) {
              const err25 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            for (const key3 in data13) {
              if (!(key3 === "id" || key3 === "source" || key3 === "label")) {
                const err26 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data13.id !== void 0) {
              if (typeof data13.id !== "string") {
                const err27 = { instancePath: instancePath + "/decisions/" + i3 + "/id", schemaPath: "#/definitions/DiagramDecision/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data13.source !== void 0) {
              if (typeof data13.source !== "string") {
                const err28 = { instancePath: instancePath + "/decisions/" + i3 + "/source", schemaPath: "#/definitions/DiagramDecision/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data13.label !== void 0) {
              if (typeof data13.label !== "string") {
                const err29 = { instancePath: instancePath + "/decisions/" + i3 + "/label", schemaPath: "#/definitions/DiagramDecision/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
          } else {
            const err30 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
      } else {
        const err31 = { instancePath: instancePath + "/decisions", schemaPath: "#/properties/decisions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
    }
    if (data.continuations !== void 0) {
      let data17 = data.continuations;
      if (Array.isArray(data17)) {
        const len4 = data17.length;
        for (let i4 = 0; i4 < len4; i4++) {
          if (!validate17(data17[i4], { instancePath: instancePath + "/continuations/" + i4, parentData: data17, parentDataProperty: i4, rootData })) {
            vErrors = vErrors === null ? validate17.errors : vErrors.concat(validate17.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err32 = { instancePath: instancePath + "/continuations", schemaPath: "#/properties/continuations/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
    }
  } else {
    const err33 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err33];
    } else {
      vErrors.push(err33);
    }
    errors++;
  }
  validate12.errors = vErrors;
  return errors === 0;
}
var schema29 = { "type": "object", "properties": { "type": { "type": "string", "const": "flowchart" }, "caption": { "type": "string" }, "legend": { "type": "object", "properties": { "main": { "type": "string" }, "branch": { "type": "string" } }, "required": ["main", "branch"], "additionalProperties": false }, "nodes": { "type": "array", "items": { "$ref": "#/definitions/DiagramNode" } }, "edges": { "type": "array", "items": { "$ref": "#/definitions/DiagramEdge" } }, "level": { "type": "number", "description": "Global level override for every node; omit for automatic topological levels." }, "direction": { "type": "string", "enum": ["top-down", "left-right"], "description": "Main flow direction." } }, "required": ["type", "caption", "legend", "nodes", "edges"], "additionalProperties": false };
var schema30 = { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." } }, "required": ["id", "label", "description"], "additionalProperties": false };
function validate21(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.description === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema30.properties, key0)) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err6 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err7 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err8 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data5 = data.weight;
      if (typeof data5 !== "string") {
        const err9 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      if (!(data5 === "primary" || data5 === "secondary" || data5 === "muted")) {
        const err10 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema16.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.nudge !== void 0) {
      if (!(typeof data.nudge == "number")) {
        const err11 = { instancePath: instancePath + "/nudge", schemaPath: "#/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.shape !== void 0) {
      let data7 = data.shape;
      if (typeof data7 !== "string") {
        const err12 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
      if (!(data7 === "card" || data7 === "state" || data7 === "table" || data7 === "event" || data7 === "terminal" || data7 === "bar")) {
        const err13 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema17.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.textAnchor !== void 0) {
      let data8 = data.textAnchor;
      if (typeof data8 !== "string") {
        const err14 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
      if (!(data8 === "start" || data8 === "end" || data8 === "middle")) {
        const err15 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema18.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data9 = data.fields;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data10 = data9[i0];
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.name === void 0) {
              const err16 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key1 in data10) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err17 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data10.name !== void 0) {
              if (typeof data10.name !== "string") {
                const err18 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data10.type !== void 0) {
              if (typeof data10.type !== "string") {
                const err19 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data10.key !== void 0) {
              let data13 = data10.key;
              if (typeof data13 !== "string") {
                const err20 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
              if (!(data13 === "pk" || data13 === "fk" || data13 === "unique")) {
                const err21 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema19.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
          } else {
            const err22 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err24 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err25 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
  } else {
    const err26 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err26];
    } else {
      vErrors.push(err26);
    }
    errors++;
  }
  validate21.errors = vErrors;
  return errors === 0;
}
function validate20(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "nodes" || key0 === "edges" || key0 === "level" || key0 === "direction")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("flowchart" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "flowchart" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data5 = data.nodes;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate21(data5[i0], { instancePath: instancePath + "/nodes/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data7 = data.edges;
      if (Array.isArray(data7)) {
        const len1 = data7.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate15(data7[i1], { instancePath: instancePath + "/edges/" + i1, parentData: data7, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate15.errors : vErrors.concat(validate15.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.level !== void 0) {
      if (!(typeof data.level == "number")) {
        const err17 = { instancePath: instancePath + "/level", schemaPath: "#/properties/level/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.direction !== void 0) {
      let data10 = data.direction;
      if (typeof data10 !== "string") {
        const err18 = { instancePath: instancePath + "/direction", schemaPath: "#/properties/direction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
      if (!(data10 === "top-down" || data10 === "left-right")) {
        const err19 = { instancePath: instancePath + "/direction", schemaPath: "#/properties/direction/enum", keyword: "enum", params: { allowedValues: schema29.properties.direction.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
  } else {
    const err20 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err20];
    } else {
      vErrors.push(err20);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
function validate26(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.from === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed" || key0 === "activation")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err5 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err6 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err7 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err9 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err10 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.activation !== void 0) {
      if (typeof data.activation !== "boolean") {
        const err11 = { instancePath: instancePath + "/activation", schemaPath: "#/properties/activation/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate26.errors = vErrors;
  return errors === 0;
}
function validate25(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.participants === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "participants" }, message: "must have required property 'participants'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.messages === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "messages" }, message: "must have required property 'messages'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "participants" || key0 === "messages")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("sequence" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "sequence" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.participants !== void 0) {
      let data5 = data.participants;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.id === void 0) {
              const err15 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data6.label === void 0) {
              const err16 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key2 in data6) {
              if (!(key2 === "id" || key2 === "label" || key2 === "kind")) {
                const err17 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data6.id !== void 0) {
              if (typeof data6.id !== "string") {
                const err18 = { instancePath: instancePath + "/participants/" + i0 + "/id", schemaPath: "#/definitions/SequenceParticipant/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data6.label !== void 0) {
              if (typeof data6.label !== "string") {
                const err19 = { instancePath: instancePath + "/participants/" + i0 + "/label", schemaPath: "#/definitions/SequenceParticipant/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data6.kind !== void 0) {
              if (typeof data6.kind !== "string") {
                const err20 = { instancePath: instancePath + "/participants/" + i0 + "/kind", schemaPath: "#/definitions/SequenceParticipant/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
          } else {
            const err21 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err21];
            } else {
              vErrors.push(err21);
            }
            errors++;
          }
        }
      } else {
        const err22 = { instancePath: instancePath + "/participants", schemaPath: "#/properties/participants/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.messages !== void 0) {
      let data10 = data.messages;
      if (Array.isArray(data10)) {
        const len1 = data10.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate26(data10[i1], { instancePath: instancePath + "/messages/" + i1, parentData: data10, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/messages", schemaPath: "#/properties/messages/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
  } else {
    const err24 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err24];
    } else {
      vErrors.push(err24);
    }
    errors++;
  }
  validate25.errors = vErrors;
  return errors === 0;
}
function validate30(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "kind" || key0 === "sublabel" || key0 === "weight" || key0 === "description" || key0 === "initial" || key0 === "final")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err4 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err5 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err6 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data4 = data.weight;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "primary" || data4 === "secondary" || data4 === "muted")) {
        const err8 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema16.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err9 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err10 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err11 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate30.errors = vErrors;
  return errors === 0;
}
function validate32(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate32.errors = vErrors;
  return errors === 0;
}
function validate29(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.states === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "states" }, message: "must have required property 'states'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.transitions === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "transitions" }, message: "must have required property 'transitions'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "states" || key0 === "transitions")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("state-machine" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "state-machine" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.states !== void 0) {
      let data5 = data.states;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate30(data5[i0], { instancePath: instancePath + "/states/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/states", schemaPath: "#/properties/states/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.transitions !== void 0) {
      let data7 = data.transitions;
      if (Array.isArray(data7)) {
        const len1 = data7.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate32(data7[i1], { instancePath: instancePath + "/transitions/" + i1, parentData: data7, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/transitions", schemaPath: "#/properties/transitions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
  } else {
    const err17 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err17];
    } else {
      vErrors.push(err17);
    }
    errors++;
  }
  validate29.errors = vErrors;
  return errors === 0;
}
function validate36(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.fields === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "fields" }, message: "must have required property 'fields'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "kind" || key0 === "weight" || key0 === "fields")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err6 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data3 = data.weight;
      if (typeof data3 !== "string") {
        const err7 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data3 === "primary" || data3 === "secondary" || data3 === "muted")) {
        const err8 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema16.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data4 = data.fields;
      if (Array.isArray(data4)) {
        const len0 = data4.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data5 = data4[i0];
          if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
            if (data5.name === void 0) {
              const err9 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            for (const key1 in data5) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err10 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
              }
            }
            if (data5.name !== void 0) {
              if (typeof data5.name !== "string") {
                const err11 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err11];
                } else {
                  vErrors.push(err11);
                }
                errors++;
              }
            }
            if (data5.type !== void 0) {
              if (typeof data5.type !== "string") {
                const err12 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
            if (data5.key !== void 0) {
              let data8 = data5.key;
              if (typeof data8 !== "string") {
                const err13 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
              if (!(data8 === "pk" || data8 === "fk" || data8 === "unique")) {
                const err14 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema19.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
            }
          } else {
            const err15 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
  } else {
    const err17 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err17];
    } else {
      vErrors.push(err17);
    }
    errors++;
  }
  validate36.errors = vErrors;
  return errors === 0;
}
function validate38(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate38.errors = vErrors;
  return errors === 0;
}
function validate35(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.entities === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "entities" }, message: "must have required property 'entities'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.relations === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "relations" }, message: "must have required property 'relations'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "entities" || key0 === "relations")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("er" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "er" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.entities !== void 0) {
      let data5 = data.entities;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate36(data5[i0], { instancePath: instancePath + "/entities/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate36.errors : vErrors.concat(validate36.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/entities", schemaPath: "#/properties/entities/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.relations !== void 0) {
      let data7 = data.relations;
      if (Array.isArray(data7)) {
        const len1 = data7.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate38(data7[i1], { instancePath: instancePath + "/relations/" + i1, parentData: data7, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/relations", schemaPath: "#/properties/relations/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
  } else {
    const err17 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err17];
    } else {
      vErrors.push(err17);
    }
    errors++;
  }
  validate35.errors = vErrors;
  return errors === 0;
}
function validate42(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.description === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "kind" || key0 === "sublabel" || key0 === "description" || key0 === "variant" || key0 === "weight")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err6 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err7 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err8 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data5 = data.variant;
      if (typeof data5 !== "string") {
        const err9 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      if (!(data5 === "main" || data5 === "branch")) {
        const err10 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data6 = data.weight;
      if (typeof data6 !== "string") {
        const err11 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (!(data6 === "primary" || data6 === "secondary" || data6 === "muted")) {
        const err12 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema16.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate42.errors = vErrors;
  return errors === 0;
}
function validate41(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.events === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "events" }, message: "must have required property 'events'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "events")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err5 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if ("timeline" !== data0) {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "timeline" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err7 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err8 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err11 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err12 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.events !== void 0) {
      let data5 = data.events;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate42(data5[i0], { instancePath: instancePath + "/events/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate42.errors : vErrors.concat(validate42.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/events", schemaPath: "#/properties/events/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
  } else {
    const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err15];
    } else {
      vErrors.push(err15);
    }
    errors++;
  }
  validate41.errors = vErrors;
  return errors === 0;
}
var schema54 = { "type": "object", "properties": { "type": { "type": "string", "const": "swimlane" }, "caption": { "type": "string" }, "legend": { "type": "object", "properties": { "main": { "type": "string" }, "branch": { "type": "string" } }, "required": ["main", "branch"], "additionalProperties": false }, "lanes": { "type": "array", "items": { "$ref": "#/definitions/SwimlaneLane" } }, "nodes": { "type": "array", "items": { "type": "object", "additionalProperties": false, "properties": { "lane": { "type": "string" }, "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." } }, "required": ["description", "id", "label", "lane"] } }, "edges": { "type": "array", "items": { "$ref": "#/definitions/DiagramEdge" } } }, "required": ["type", "caption", "legend", "lanes", "nodes", "edges"], "additionalProperties": false };
function validate45(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.lanes === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "lanes" }, message: "must have required property 'lanes'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "lanes" || key0 === "nodes" || key0 === "edges")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if ("swimlane" !== data0) {
        const err8 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "swimlane" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err9 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err12 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err13 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err14 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.lanes !== void 0) {
      let data5 = data.lanes;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.id === void 0) {
              const err16 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            if (data6.label === void 0) {
              const err17 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            for (const key2 in data6) {
              if (!(key2 === "id" || key2 === "label" || key2 === "kind")) {
                const err18 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data6.id !== void 0) {
              if (typeof data6.id !== "string") {
                const err19 = { instancePath: instancePath + "/lanes/" + i0 + "/id", schemaPath: "#/definitions/SwimlaneLane/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data6.label !== void 0) {
              if (typeof data6.label !== "string") {
                const err20 = { instancePath: instancePath + "/lanes/" + i0 + "/label", schemaPath: "#/definitions/SwimlaneLane/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data6.kind !== void 0) {
              if (typeof data6.kind !== "string") {
                const err21 = { instancePath: instancePath + "/lanes/" + i0 + "/kind", schemaPath: "#/definitions/SwimlaneLane/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
          } else {
            const err22 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/lanes", schemaPath: "#/properties/lanes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data10 = data.nodes;
      if (Array.isArray(data10)) {
        const len1 = data10.length;
        for (let i1 = 0; i1 < len1; i1++) {
          let data11 = data10[i1];
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.description === void 0) {
              const err24 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data11.id === void 0) {
              const err25 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            if (data11.label === void 0) {
              const err26 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err26];
              } else {
                vErrors.push(err26);
              }
              errors++;
            }
            if (data11.lane === void 0) {
              const err27 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "lane" }, message: "must have required property 'lane'" };
              if (vErrors === null) {
                vErrors = [err27];
              } else {
                vErrors.push(err27);
              }
              errors++;
            }
            for (const key3 in data11) {
              if (!func2.call(schema54.properties.nodes.items.properties, key3)) {
                const err28 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data11.lane !== void 0) {
              if (typeof data11.lane !== "string") {
                const err29 = { instancePath: instancePath + "/nodes/" + i1 + "/lane", schemaPath: "#/properties/nodes/items/properties/lane/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
            if (data11.id !== void 0) {
              if (typeof data11.id !== "string") {
                const err30 = { instancePath: instancePath + "/nodes/" + i1 + "/id", schemaPath: "#/properties/nodes/items/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data11.label !== void 0) {
              if (typeof data11.label !== "string") {
                const err31 = { instancePath: instancePath + "/nodes/" + i1 + "/label", schemaPath: "#/properties/nodes/items/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data11.description !== void 0) {
              if (typeof data11.description !== "string") {
                const err32 = { instancePath: instancePath + "/nodes/" + i1 + "/description", schemaPath: "#/properties/nodes/items/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err32];
                } else {
                  vErrors.push(err32);
                }
                errors++;
              }
            }
            if (data11.kind !== void 0) {
              if (typeof data11.kind !== "string") {
                const err33 = { instancePath: instancePath + "/nodes/" + i1 + "/kind", schemaPath: "#/properties/nodes/items/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            if (data11.sublabel !== void 0) {
              if (typeof data11.sublabel !== "string") {
                const err34 = { instancePath: instancePath + "/nodes/" + i1 + "/sublabel", schemaPath: "#/properties/nodes/items/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err34];
                } else {
                  vErrors.push(err34);
                }
                errors++;
              }
            }
            if (data11.weight !== void 0) {
              let data18 = data11.weight;
              if (typeof data18 !== "string") {
                const err35 = { instancePath: instancePath + "/nodes/" + i1 + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err35];
                } else {
                  vErrors.push(err35);
                }
                errors++;
              }
              if (!(data18 === "primary" || data18 === "secondary" || data18 === "muted")) {
                const err36 = { instancePath: instancePath + "/nodes/" + i1 + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema16.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err36];
                } else {
                  vErrors.push(err36);
                }
                errors++;
              }
            }
            if (data11.nudge !== void 0) {
              if (!(typeof data11.nudge == "number")) {
                const err37 = { instancePath: instancePath + "/nodes/" + i1 + "/nudge", schemaPath: "#/properties/nodes/items/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err37];
                } else {
                  vErrors.push(err37);
                }
                errors++;
              }
            }
            if (data11.shape !== void 0) {
              let data20 = data11.shape;
              if (typeof data20 !== "string") {
                const err38 = { instancePath: instancePath + "/nodes/" + i1 + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err38];
                } else {
                  vErrors.push(err38);
                }
                errors++;
              }
              if (!(data20 === "card" || data20 === "state" || data20 === "table" || data20 === "event" || data20 === "terminal" || data20 === "bar")) {
                const err39 = { instancePath: instancePath + "/nodes/" + i1 + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema17.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err39];
                } else {
                  vErrors.push(err39);
                }
                errors++;
              }
            }
            if (data11.textAnchor !== void 0) {
              let data21 = data11.textAnchor;
              if (typeof data21 !== "string") {
                const err40 = { instancePath: instancePath + "/nodes/" + i1 + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err40];
                } else {
                  vErrors.push(err40);
                }
                errors++;
              }
              if (!(data21 === "start" || data21 === "end" || data21 === "middle")) {
                const err41 = { instancePath: instancePath + "/nodes/" + i1 + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema18.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err41];
                } else {
                  vErrors.push(err41);
                }
                errors++;
              }
            }
            if (data11.fields !== void 0) {
              let data22 = data11.fields;
              if (Array.isArray(data22)) {
                const len2 = data22.length;
                for (let i2 = 0; i2 < len2; i2++) {
                  let data23 = data22[i2];
                  if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                    if (data23.name === void 0) {
                      const err42 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
                      if (vErrors === null) {
                        vErrors = [err42];
                      } else {
                        vErrors.push(err42);
                      }
                      errors++;
                    }
                    for (const key4 in data23) {
                      if (!(key4 === "name" || key4 === "type" || key4 === "key")) {
                        const err43 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
                        if (vErrors === null) {
                          vErrors = [err43];
                        } else {
                          vErrors.push(err43);
                        }
                        errors++;
                      }
                    }
                    if (data23.name !== void 0) {
                      if (typeof data23.name !== "string") {
                        const err44 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err44];
                        } else {
                          vErrors.push(err44);
                        }
                        errors++;
                      }
                    }
                    if (data23.type !== void 0) {
                      if (typeof data23.type !== "string") {
                        const err45 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err45];
                        } else {
                          vErrors.push(err45);
                        }
                        errors++;
                      }
                    }
                    if (data23.key !== void 0) {
                      let data26 = data23.key;
                      if (typeof data26 !== "string") {
                        const err46 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err46];
                        } else {
                          vErrors.push(err46);
                        }
                        errors++;
                      }
                      if (!(data26 === "pk" || data26 === "fk" || data26 === "unique")) {
                        const err47 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema19.properties.key.enum }, message: "must be equal to one of the allowed values" };
                        if (vErrors === null) {
                          vErrors = [err47];
                        } else {
                          vErrors.push(err47);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err48 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                    if (vErrors === null) {
                      vErrors = [err48];
                    } else {
                      vErrors.push(err48);
                    }
                    errors++;
                  }
                }
              } else {
                const err49 = { instancePath: instancePath + "/nodes/" + i1 + "/fields", schemaPath: "#/properties/nodes/items/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err49];
                } else {
                  vErrors.push(err49);
                }
                errors++;
              }
            }
            if (data11.initial !== void 0) {
              if (typeof data11.initial !== "boolean") {
                const err50 = { instancePath: instancePath + "/nodes/" + i1 + "/initial", schemaPath: "#/properties/nodes/items/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err50];
                } else {
                  vErrors.push(err50);
                }
                errors++;
              }
            }
            if (data11.final !== void 0) {
              if (typeof data11.final !== "boolean") {
                const err51 = { instancePath: instancePath + "/nodes/" + i1 + "/final", schemaPath: "#/properties/nodes/items/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err51];
                } else {
                  vErrors.push(err51);
                }
                errors++;
              }
            }
          } else {
            const err52 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err52];
            } else {
              vErrors.push(err52);
            }
            errors++;
          }
        }
      } else {
        const err53 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err53];
        } else {
          vErrors.push(err53);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data29 = data.edges;
      if (Array.isArray(data29)) {
        const len3 = data29.length;
        for (let i3 = 0; i3 < len3; i3++) {
          if (!validate15(data29[i3], { instancePath: instancePath + "/edges/" + i3, parentData: data29, parentDataProperty: i3, rootData })) {
            vErrors = vErrors === null ? validate15.errors : vErrors.concat(validate15.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err54 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err54];
        } else {
          vErrors.push(err54);
        }
        errors++;
      }
    }
  } else {
    const err55 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err55];
    } else {
      vErrors.push(err55);
    }
    errors++;
  }
  validate45.errors = vErrors;
  return errors === 0;
}
function validate11(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (!validate12(data, { instancePath, parentData, parentDataProperty, rootData })) {
    vErrors = vErrors === null ? validate12.errors : vErrors.concat(validate12.errors);
    errors = vErrors.length;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs2 = errors;
    if (!validate20(data, { instancePath, parentData, parentDataProperty, rootData })) {
      vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
      errors = vErrors.length;
    }
    var _valid0 = _errs2 === errors;
    valid0 = valid0 || _valid0;
    if (!valid0) {
      const _errs3 = errors;
      if (!validate25(data, { instancePath, parentData, parentDataProperty, rootData })) {
        vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
        errors = vErrors.length;
      }
      var _valid0 = _errs3 === errors;
      valid0 = valid0 || _valid0;
      if (!valid0) {
        const _errs4 = errors;
        if (!validate29(data, { instancePath, parentData, parentDataProperty, rootData })) {
          vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs4 === errors;
        valid0 = valid0 || _valid0;
        if (!valid0) {
          const _errs5 = errors;
          if (!validate35(data, { instancePath, parentData, parentDataProperty, rootData })) {
            vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
            errors = vErrors.length;
          }
          var _valid0 = _errs5 === errors;
          valid0 = valid0 || _valid0;
          if (!valid0) {
            const _errs6 = errors;
            if (!validate41(data, { instancePath, parentData, parentDataProperty, rootData })) {
              vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs6 === errors;
            valid0 = valid0 || _valid0;
            if (!valid0) {
              const _errs7 = errors;
              if (!validate45(data, { instancePath, parentData, parentDataProperty, rootData })) {
                vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
                errors = vErrors.length;
              }
              var _valid0 = _errs7 === errors;
              valid0 = valid0 || _valid0;
            }
          }
        }
      }
    }
  }
  if (!valid0) {
    const err0 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate11.errors = vErrors;
  return errors === 0;
}
function validate10(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (!validate11(data, { instancePath, parentData, parentDataProperty, rootData })) {
    vErrors = vErrors === null ? validate11.errors : vErrors.concat(validate11.errors);
    errors = vErrors.length;
  }
  validate10.errors = vErrors;
  return errors === 0;
}

// src/validation/index.ts
var unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function inspect(value, path = "", ancestors = /* @__PURE__ */ new Set(), depth = 0) {
  if (depth > 64) return [{ path, code: "depth", message: "Maximum data depth is 64" }];
  if (typeof value === "number" && !Number.isFinite(value))
    return [{ path, code: "finite", message: "Expected a finite number" }];
  if (typeof value === "string") {
    try {
      encodeURIComponent(value);
    } catch {
      return [{ path, code: "unicode", message: "Unpaired Unicode surrogate is not supported" }];
    }
  }
  if (value === null || typeof value !== "object") return [];
  if (ancestors.has(value))
    return [{ path, code: "cycle", message: "Cyclic objects are not diagram data" }];
  ancestors.add(value);
  const issues = [];
  for (const [key, child] of Object.entries(value)) {
    if (unsafe.has(key))
      issues.push({ path: `${path}/${key}`, code: "unsafe-key", message: "Reserved object key" });
    issues.push(...inspect(child, `${path}/${key}`, ancestors, depth + 1));
    if (issues.length > 100) break;
  }
  ancestors.delete(value);
  return issues;
}
function diagramNodeIds(spec) {
  switch (spec.type) {
    case "sequence":
      return spec.participants.map((node) => node.id);
    case "state-machine":
      return spec.states.map((node) => node.id);
    case "er":
      return spec.entities.map((node) => node.id);
    case "timeline":
      return spec.events.map((node) => node.id);
    default:
      return spec.nodes.map((node) => node.id);
  }
}
function relations(spec) {
  switch (spec.type) {
    case "sequence":
      return spec.messages;
    case "state-machine":
      return spec.transitions;
    case "er":
      return spec.relations;
    case "timeline":
      return [];
    default:
      return spec.edges;
  }
}
function validateDiagramSpec(input) {
  const issues = inspect(input);
  if (issues.length) return { success: false, issues };
  if (!structural_default(input))
    return {
      success: false,
      issues: (structural_default.errors ?? []).slice(0, 100).map((error) => ({
        path: error.instancePath || "/",
        code: error.keyword,
        message: `${error.message ?? "Invalid value"}${error.params.missingProperty ? `: ${error.params.missingProperty}` : ""}`
      }))
    };
  const spec = input;
  const add = (path, code, message) => issues.push({ path, code, message });
  const unique = (ids2, path) => {
    const seen = /* @__PURE__ */ new Set();
    ids2.forEach((id, index) => {
      if (!id.trim() || unsafe.has(id))
        add(`${path}/${index}/id`, "id", "Expected a non-empty, non-reserved ID");
      if (seen.has(id)) add(`${path}/${index}/id`, "duplicate-id", `Duplicate ID: ${id}`);
      seen.add(id);
    });
  };
  const ids = diagramNodeIds(spec);
  unique(ids, "/nodes");
  const nodes = new Set(ids);
  const edges = relations(spec);
  unique(
    edges.flatMap((edge) => edge.id === void 0 ? [] : [edge.id]),
    "/relations"
  );
  edges.forEach((edge, index) => {
    for (const endpoint of ["from", "to"]) {
      if (!nodes.has(edge[endpoint]))
        add(`/relations/${index}/${endpoint}`, "reference", `Unknown node: ${edge[endpoint]}`);
    }
  });
  if (spec.type === "band") {
    spec.nodes.forEach((node, index) => {
      if (!Number.isInteger(node.band) || node.band < 0 || node.band >= spec.bands.length)
        add(`/nodes/${index}/band`, "range", "Band must reference an existing column");
    });
    unique(
      (spec.continuations ?? []).map((item) => item.id),
      "/continuations"
    );
    unique(
      (spec.decisions ?? []).map((item) => item.id),
      "/decisions"
    );
    for (const [index, item] of (spec.continuations ?? []).entries())
      if (!nodes.has(item.from))
        add(`/continuations/${index}/from`, "reference", "Unknown continuation source");
    for (const [index, item] of (spec.decisions ?? []).entries())
      if (!nodes.has(item.source))
        add(`/decisions/${index}/source`, "reference", "Unknown decision source");
  }
  if (spec.type === "swimlane") {
    unique(
      spec.lanes.map((lane) => lane.id),
      "/lanes"
    );
    const lanes = new Set(spec.lanes.map((lane) => lane.id));
    spec.nodes.forEach((node, index) => {
      if (!lanes.has(node.lane)) add(`/nodes/${index}/lane`, "reference", "Unknown lane");
    });
  }
  if (spec.type === "flowchart" && spec.level !== void 0 && (!Number.isInteger(spec.level) || spec.level < 0))
    add("/level", "range", "Level must be a non-negative integer");
  return issues.length ? { success: false, issues } : { success: true, data: spec };
}
function assertDiagramSpec(input) {
  const result = validateDiagramSpec(input);
  if (!result.success)
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
}
function validateLocalizedDiagram(input) {
  if (!input || typeof input !== "object")
    return {
      success: false,
      issues: [{ path: "/", code: "object", message: "Expected en and es specs" }]
    };
  const record = input;
  const en = validateDiagramSpec(record.en);
  const es = validateDiagramSpec(record.es);
  if (!en.success || !es.success)
    return {
      success: false,
      issues: [
        ...!en.success ? en.issues.map((issue) => ({ ...issue, path: `/en${issue.path}` })) : [],
        ...!es.success ? es.issues.map((issue) => ({ ...issue, path: `/es${issue.path}` })) : []
      ]
    };
  const topology = (spec) => JSON.stringify({
    type: spec.type,
    ids: diagramNodeIds(spec),
    edges: relations(spec).map(({ id, from, to }) => [id, from, to])
  });
  if (topology(en.data) !== topology(es.data))
    return {
      success: false,
      issues: [
        {
          path: "/",
          code: "topology",
          message: "Locales must preserve type, ordered IDs and relations"
        }
      ]
    };
  return { success: true, data: { en: en.data, es: es.data } };
}
export {
  assertDiagramSpec,
  diagramNodeIds,
  validateDiagramSpec,
  validateLocalizedDiagram
};
