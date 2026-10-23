import {useId} from 'react';
import CategoryPathSelector from './CategoryPathSelector';

/** Product forms now use progressive category selection rather than a long mixed dropdown. */
export default function CategoryPicker({categories=[],value='',onChange,disabled=false,required=true,label='Category / subcategory'}) {
 const id=useId().replaceAll(':','');
 return <CategoryPathSelector idPrefix={`nx71-product-${id}`} categories={categories} value={value} onChange={onChange}
  disabled={disabled} required={required} label={label}/>;
}
