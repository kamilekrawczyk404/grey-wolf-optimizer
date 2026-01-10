import {createContext, Dispatch, ReactNode, SetStateAction, useContext, useState} from "react";

export interface ModalContextValues {
    activeModalId: string | null;
    setActiveModal: Dispatch<SetStateAction<string | null>>
    closeModal: () => void
}

const ModalContext = createContext<ModalContextValues | null>(null)

export const ModalProvider = ({children}: {children: ReactNode}) => {
    const [activeModalId, setActiveModalId] = useState<string | null>(null)

    return <ModalContext.Provider
        value={{
            activeModalId,
            setActiveModal: setActiveModalId,
            closeModal: () => {
                console.log('calling close');
                setActiveModalId(null);
        }}}
    >
        {children}
    </ModalContext.Provider>
}

export const useModal = () => {
    const context = useContext(ModalContext)

    if (!context) {
        throw new Error("useModal must be used within a ModalContextProvider")
    }

    return context;
}
