export interface Column {
  key:         string;
  label:       string;
  sortable:    boolean;
  filterable:  boolean;
  align:       'left' | 'right';
  sortApiKey?: string;
}

export const COLUMNS: Column[] = [
  { key: 'norad',  label: 'NORAD',        sortable: true,  filterable: false, align: 'left',  sortApiKey: 'norad_cat_id' },
  { key: 'name',   label: 'OBJECT NAME',  sortable: true,  filterable: false, align: 'left',  sortApiKey: 'object_name'  },
  { key: 'cospar', label: 'COSPAR',       sortable: true,  filterable: false, align: 'left'                              },
  { key: 'type',   label: 'TYPE',         sortable: true,  filterable: true,  align: 'left'                              },
  { key: 'status', label: 'STATUS',       sortable: true,  filterable: true,  align: 'left'                              },
  { key: 'owner',  label: 'OWNER',        sortable: true,  filterable: true,  align: 'left'                              },
  { key: 'orbit',  label: 'ORBIT',        sortable: true,  filterable: true,  align: 'left'                              },
  { key: 'launch', label: 'LAUNCH',       sortable: true,  filterable: false, align: 'left',  sortApiKey: 'launch_date'  },
  { key: 'period', label: 'PERIOD (MIN)', sortable: true,  filterable: false, align: 'right', sortApiKey: 'period'       },
  { key: 'incl',   label: 'INCL (°)',     sortable: true,  filterable: false, align: 'right', sortApiKey: 'inclination'  },
  { key: 'ap_pe',  label: 'AP / PE (KM)', sortable: true,  filterable: false, align: 'right', sortApiKey: 'apogee'       },
];

export type FilterCol = 'type' | 'status' | 'owner' | 'orbit';
export const FILTER_COLS: FilterCol[] = ['type', 'status', 'owner', 'orbit'];
