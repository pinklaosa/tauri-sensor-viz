// import { useState, useRef, useEffect } from "react";

interface AddSensorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddSensorModal({ isOpen, onClose }: AddSensorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="card modal-content">
                <div className="modal-header">
                    <h2>Add Special Sensor</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p>New sensor configuration will appear here.</p>
                </div>
                <div className="modal-footer">
                    <button className="secondary-btn" onClick={onClose}>Cancel</button>
                    <button className="primary-btn">Add Sensor</button>
                </div>
            </div>
        </div>
    );
}
