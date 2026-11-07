import {createContext,useContext,type ReactNode} from 'react';
export interface Platform {production: boolean; previewOrigin: string}
const context = createContext<Platform>({production: false,previewOrigin: ''});
export function PlatformProvider({value,children}: {value: Platform;children: ReactNode}) {return <context.Provider value={value}>{children}</context.Provider>;}
export const usePlatform = () => useContext(context);
