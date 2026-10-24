import { FormField } from "../ui/index";
import {useId,useRef,useState} from 'react';
import UiIcon from '../common/UiIcon';

/** Accessible themed file input: the native control remains clickable and keyboard-operable. */
export default function FileUploadField({label='Choose image',accept='image/jpeg,image/png,image/webp',multiple=false,required=false,disabled=false,onChange,selection,help=''}){
 const id=useId();const inputRef=useRef(null);const [localNames,setLocalNames]=useState('');
 const chosen=selection === undefined ? localNames : selection;
 return <div className="nx71-file-field"><FormField className="nx71-file-label" htmlFor={id}>{label}{required&&<b className="nx34-required" aria-hidden="true"> *</b>}</FormField>
  <div className="nx71-file-drop" onDragOver={e=>{if(!disabled)e.preventDefault();}} onDrop={e=>{if(disabled)return;e.preventDefault();const files=e.dataTransfer.files;if(!files?.length)return;try{inputRef.current.files=files;}catch{return;}setLocalNames(files.length>1?`${files.length} files selected`:files[0].name);onChange?.({target:inputRef.current});}}><UiIcon name="images" size={22}/><span className="nx71-file-text"><strong>{chosen||'Choose files or drop them here'}</strong><small>{help||'JPG, PNG or WebP'}</small></span><span className="nx71-file-trigger">Browse files</span>
   <input ref={inputRef} id={id} type="file" accept={accept} multiple={multiple} required={required} disabled={disabled} aria-label={label}
     onChange={e=>{const files=[...(e.target.files||[])];setLocalNames(files.length>1?`${files.length} files selected`:files[0]?.name||'');onChange?.(e);}}/>
  </div></div>;
}
