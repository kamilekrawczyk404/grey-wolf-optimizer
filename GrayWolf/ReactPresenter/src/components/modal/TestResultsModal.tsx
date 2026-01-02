import React from 'react'
import ModalSkeleton from "./ModalSkeleton";
import {layoutColors} from "../../colors";

const TestResultsModal = () => {
    const modalBody =
        <div>Testowy element</div>


    const modalFooter = (closeModal: () => void) => (
        <button
            className={`border-[1px] rounded-md px-2 h-10 place-content-center text-sm ${layoutColors.cyan.border.primary} ml-auto`}
            onClick={(e) => {
                e.stopPropagation();
                closeModal();
            }}
        >
            Wróć do konfiguratora
        </button>
    )

    return (
        <ModalSkeleton modalId={'test-results'} title={"Test results (Module 1)"} modalBody={modalBody} modalFooter={(closeModal) => modalFooter(closeModal)}/>
    )
}

export default TestResultsModal