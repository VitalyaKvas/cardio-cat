import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, HeatmapChart, LineChart, CustomChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'

let registered = false

export function registerECharts(): void {
  if (registered) return
  use([
    CanvasRenderer,
    LineChart,
    BarChart,
    HeatmapChart,
    CustomChart,
    ScatterChart,
    GridComponent,
    TooltipComponent,
    MarkAreaComponent,
    MarkLineComponent,
    MarkPointComponent,
    VisualMapComponent,
  ])
  registered = true
}
