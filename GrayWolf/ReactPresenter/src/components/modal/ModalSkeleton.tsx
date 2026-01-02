import React, {ReactNode, useEffect, useRef} from 'react'
import {AnimatePresence, motion} from "framer-motion";
import {useModal} from "../../context/ModalContext";
import {layoutColors} from "../../colors";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faClose} from "@fortawesome/free-solid-svg-icons";

type ModalSkeletonProps = {
    modalId: string;
    title: string;
    modalBody: ReactNode,
    modalFooter: (closeModal: () => void) => ReactNode
}

const ModalSkeleton = ({modalId, title, modalBody, modalFooter}: ModalSkeletonProps) => {
    const {activeModalId, closeModal} = useModal()

    const modalWrapper = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const checkClickOutside = (e: MouseEvent) => {
            e.stopPropagation();

            if (!modalWrapper?.current)
                return;

            console.log(activeModalId, modalWrapper.current.contains(e.target as Node))
            if (activeModalId !== null && !modalWrapper.current.contains(e.target as Node)) {
                closeModal()
            }
        }

        document.addEventListener('click', checkClickOutside)

        return () => document.removeEventListener('click', checkClickOutside)
    }, [activeModalId, modalWrapper])

    const handleCloseModal = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation()
        closeModal()
    }

    return (
        <AnimatePresence >
            {activeModalId === modalId && (
                <div className={'fixed inset-0 bg-black/80 backdrop-blur-[1px] flex items-center justify-center z-[100] p-4'}>
                    <motion.div
                        ref={modalWrapper}
                        initial={{translateY: "1rem", opacity: 0}}
                        animate={{translateY: 0, opacity: 1}}
                        exit={{translateY: "-1rem", opacity: 0}}
                        transition={{
                            duration: .3,
                            ease: "easeOut",
                        }}
                        className={`${layoutColors.neutral.background.dark} ${layoutColors.neutral.border.primary} ${layoutColors.neutral.text.primary} md:max-w-[20rem] w-full border-[1px] rounded-lg`}>
                        <section className={`flex items-center justify-between p-4 border-b-[1px] ${layoutColors.neutral.border.primary}`}>
                            <h3 className={`text-xl`}>{title}</h3>
                            <button className={'text-sm'} onClick={handleCloseModal}>
                                <FontAwesomeIcon icon={faClose}/>
                            </button>
                        </section>
                        <main className={'p-4'}>
                            {modalBody}
                        </main>
                        <footer className={`flex p-4 border-t-[1px] ${layoutColors.neutral.border.primary}`}>
                            {modalFooter(closeModal)}
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default ModalSkeleton