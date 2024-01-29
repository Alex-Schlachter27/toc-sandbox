import * as OBC from "openbim-components"
import * as WEBIFC from "web-ifc"
import { FragmentsGroup } from "bim-fragment"

type QtoResult = { [setName: string]: { [qtoName: string]: number } }
// const QtoResultExample: QtoResult = {
//   Qto_WallBaseQuantitites: {
//     volume: 40,
//     area: 20
//   },
//   Qto_SlabBaseQuantitites: {
//     perimeter: 12,
//     area: 80,
//     volume: 13
//   },
// }

export class SimpleQto extends OBC.Component<QtoResult> implements OBC.UI, OBC.Disposable {
  static uuid = "8b75d487-cc9e-4513-879c-328798196f16"
  private _components: OBC.Components
  private _result: QtoResult = {}
  enabled = true
  uiElement = new OBC.UIElement<{
    activationButton: OBC.Button
    qtoWindow: OBC.FloatingWindow
  }>()

  constructor(components: OBC.Components) {
    super(components)
    this._components = components
    this._components.tools.add(SimpleQto.uuid, this)
    this.setUI()
  }

  async setup() {
    const highlighter = await this._components.tools.get(OBC.FragmentHighlighter)
    highlighter.events.select.onHighlight.add(async (fragmentIdMap) => {
      await this.sumQuantities(fragmentIdMap)
      await this.sumQuantitiesV2(fragmentIdMap)
    })
    highlighter.events.select.onClear.add(() => this.resetQuantities())
  }

  resetQuantities() {
    this._result = {}
  }
  
  async dispose() {
    this.resetQuantities()
    this.uiElement.dispose()
  }

  private setUI() {
    const activationButton = new OBC.Button(this._components)
    activationButton.materialIcon = "functions"

    const qtoWindow = new OBC.FloatingWindow(this._components)
    qtoWindow.title = "Quantification"
    this._components.ui.add(qtoWindow)
    qtoWindow.visible = false

    activationButton.onClick.add(() => {
      activationButton.active = !activationButton.active
      qtoWindow.visible = activationButton.active
    })

    this.uiElement.set({activationButton, qtoWindow})
  }

  async sumQuantities(fragmentIdMap: OBC.FragmentIdMap) {
    console.time("Quantities V1")
    const fragmentManager = await this._components.tools.get(OBC.FragmentManager)
    for (const fragmentID in fragmentIdMap) {
      const fragment = fragmentManager.list[fragmentID]
      const model = fragment.mesh.parent
      if (!(model instanceof FragmentsGroup && model.properties)) { continue }
      const properties = model.properties
      const expressIDs = fragmentIdMap[fragmentID]
      OBC.IfcPropertiesUtils.getRelationMap(
        properties,
        WEBIFC.IFCRELDEFINESBYPROPERTIES,
        (setID, relatedIDs) => {
          const set = properties[setID]
          const containedIDs = relatedIDs.filter(id => expressIDs.has(id.toString()))
          const { name: setName } = OBC.IfcPropertiesUtils.getEntityName(properties, setID)
          if (set.type !== WEBIFC.IFCELEMENTQUANTITY || containedIDs.length === 0 || !setName) { return }
          if (!(setName in this._result)) { this._result[setName] = {} }
          OBC.IfcPropertiesUtils.getQsetQuantities( 
            properties,
            setID,
            (qtoID) => {
              const { name: qtoName } = OBC.IfcPropertiesUtils.getEntityName(properties, qtoID)
              const { value } = OBC.IfcPropertiesUtils.getQuantityValue(properties, qtoID)
              if (!qtoName || !value) { return }
              if (!(qtoName in this._result[setName])) { this._result[setName][qtoName] = 0 }
              this._result[setName][qtoName] += value
            }
          )
        }
      )
    }
    console.log(this._result)
    console.timeEnd("Quantities V1")
  }

  async sumQuantitiesV2(fragmentIdMap: OBC.FragmentIdMap) {
    console.time("Quantitites V2")
    const fragmentManager = await this._components.tools.get(OBC.FragmentManager)
    const propertiesProcessor = await this._components.tools.get(OBC.IfcPropertiesProcessor)
    for (const fragmentID in fragmentIdMap) {
      const fragment = fragmentManager.list[fragmentID]
      const model = fragment.mesh.parent
      if (!(model instanceof FragmentsGroup && model.properties)) { continue }
      const properties = model.properties
      const modelIndexMap = propertiesProcessor.get()[model.uuid]
      if (!modelIndexMap) { continue }
      const expressIDs = fragmentIdMap[fragmentID]
      for (const expressID of expressIDs) {
        const entityMap = modelIndexMap[Number(expressID)]
        if (!entityMap) { continue }
        for (const mapID of entityMap) {
          const entity = properties[mapID]
          const { name: setName } = OBC.IfcPropertiesUtils.getEntityName(properties, mapID)
          if (!(entity.type === WEBIFC.IFCELEMENTQUANTITY && setName)) { continue }
          if (!(setName in this._result)) { this._result[setName] = {} }
          OBC.IfcPropertiesUtils.getQsetQuantities(
            properties,
            mapID,
            (qtoID) => {
              const { name: qtoName } = OBC.IfcPropertiesUtils.getEntityName(properties, qtoID)
              const { value } = OBC.IfcPropertiesUtils.getQuantityValue(properties, qtoID)
              if (!(qtoName && value)) { return }
              if (!(qtoName in this._result[setName])) { this._result[setName][qtoName] = 0 }
              this._result[setName][qtoName] += value
            }
          )
        }
      }
    }
    console.log(this._result)
    console.timeEnd("Quantitites V2")
  }
  
  get(): QtoResult {
    return this._result
  }

}

export class SimpleQtoOriginal extends OBC.Component<QtoResult> implements OBC.UI, OBC.Disposable {
  static uuid = "d9b9afae-8e97-4d54-8b57-3fbce5793045"
  private _components: OBC.Components
  private _result: QtoResult = {}
  uiElement = new OBC.UIElement<{
    activationButton: OBC.Button
    qtoWindow: OBC.FloatingWindow
  }>()
  enabled = true

  constructor(components: OBC.Components) {
    super(components)
    this._components = components
    this._components.tools.add(SimpleQto.uuid, this)
    this.setUI()
  }

  async setup() {
    const highlighter = await this._components.tools.get(OBC.FragmentHighlighter)
    highlighter.events.select.onHighlight.add(this.sumQuantities)
    highlighter.events.select.onClear.add(() => this.resetQto())
  }

  private setUI() {
    const activationButton = new OBC.Button(this._components)
    activationButton.materialIcon = "functions"

    const qtoWindow = new OBC.FloatingWindow(this._components)
    qtoWindow.visible = false
    this._components.ui.add(qtoWindow)
    qtoWindow.title = "Quantification"

    activationButton.onClick.add(() => {
      activationButton.active = !activationButton.active
      qtoWindow.visible = activationButton.active
    })

    this.uiElement.set({activationButton, qtoWindow})
  }

  private async updateQtoUI() {
    const qtoWindow = this.uiElement.get("qtoWindow")
    await qtoWindow.slots.content.dispose(true)
    const qtoTemplate = `
      <div>
        <p id="qto" style="color: rgb(180, 180, 180)"}>Sample: 0</p>
      </div>
    `
    for (const setName in this._result) {
      const qtoGroup = new OBC.TreeView(this._components)
      qtoGroup.slots.content.get().style.rowGap = "4px"
      qtoGroup.title = setName
      qtoWindow.addChild(qtoGroup)
      const qtos = this._result[setName]
      for (const qtoName in qtos) {
        const value = qtos[qtoName]
        const ui = new OBC.SimpleUIComponent(this._components, qtoTemplate)
        ui.get().style.display = "flex"
        const qtoElement = ui.getInnerElement("qto") as HTMLParagraphElement
        qtoElement.textContent = `${qtoName}: ${value.toFixed(2)}`
        qtoGroup.addChild(ui)
      }
    }
  }

  async dispose() {
    const highlighter = await this._components.tools.get(OBC.FragmentHighlighter)
    highlighter.events.select.onHighlight.remove(this.sumQuantities)
    this.uiElement.dispose()
    this.resetQto()
  }
  
  sumQuantities = async (fragmentIdMap: OBC.FragmentIdMap) => {
    this.resetQto()
    console.time("Qto")
    const fragmentManager = await this._components.tools.get(OBC.FragmentManager)
    for (const fragmentID in fragmentIdMap) {
      const fragment = fragmentManager.list[fragmentID]
      const model = fragment.mesh.parent
      if (!(model instanceof FragmentsGroup && model.properties)) { continue }
      const properties = model.properties
      const expressIDs = fragmentIdMap[fragmentID]
      OBC.IfcPropertiesUtils.getRelationMap(
        properties,
        WEBIFC.IFCRELDEFINESBYPROPERTIES,
        (setID, relatedIDs) => {
          const set = properties[setID]
          const { name: setName } = OBC.IfcPropertiesUtils.getEntityName(properties, setID)
          const workingIDs = relatedIDs.filter(id => expressIDs.has(id.toString()))
          if (!(set.type === WEBIFC.IFCELEMENTQUANTITY && workingIDs.length > 0 && setName)) { return }
          if (!(setName in this._result)) { this._result[setName] = {} }
          OBC.IfcPropertiesUtils.getQsetQuantities(
            properties,
            setID,
            (qtoID) => {
              const { name: qtoName } = OBC.IfcPropertiesUtils.getEntityName(properties, qtoID)
              const { value } = OBC.IfcPropertiesUtils.getQuantityValue(properties, qtoID)
              if (!(qtoName && value)) { return }
              if (!(qtoName in this._result[setName])) { this._result[setName][qtoName] = 0 }
              this._result[setName][qtoName] += value
            }
          )
        }
      )
    }
    console.log(this._result)
    console.timeEnd("Qto")
    await this.updateQtoUI()
  }

  resetQto() {
    this._result = {}
    const qtoWindow = this.uiElement.get("qtoWindow")
    qtoWindow.slots.content.dispose(true)
  }

  get(): QtoResult {
    return this._result
  }
}