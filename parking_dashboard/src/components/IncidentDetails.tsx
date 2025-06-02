import { useState } from "react";
import {  Shield, X, Check, Clock } from "lucide-react";
import type { SecurityIncident } from "../types/type";

type IncidentDetailsProps = {
  incident: SecurityIncident;
  onClose: () => void;
  onResolve: (id: number) => void;
};

const IncidentDetails = ({ incident, onClose, onResolve }: IncidentDetailsProps) => {
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = () => {
    setIsResolving(true);
    // Simulate API call
    setTimeout(() => {
      onResolve(incident.id);
      setIsResolving(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0  bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <Shield className="mr-3" size={28} />
                Incident Details
              </h2>
              <div className="mt-2 flex items-center space-x-4">
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-semibold">
                  {incident.incident_type.replace(/_/g, " ")}
                </span>
                <span className="flex items-center text-sm">
                  <Clock className="mr-1" size={16} />
                  {new Date(incident.incident_time).toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors hover:text-orange-400 hover:cursor-pointer cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100">
              <h3 className="font-semibold text-gray-700 mb-2">Vehicle Plate</h3>
              <p className="text-2xl font-bold text-gray-800">{incident.car_plate}</p>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100">
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <div className="flex items-center">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    incident.resolved
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {incident.resolved ? "Resolved" : "Active"}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100">
              <h3 className="font-semibold text-gray-700 mb-2">Severity</h3>
              <div className="flex items-center">
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  {incident.incident_type === "UNAUTHORIZED_EXIT" ? "High" : "Medium"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {incident.description}
              </p>
            </div>

            {/* {incident.evidence_image && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Evidence</h3>
                <div className="bg-gray-100 rounded-lg border border-gray-200 p-4">
                  <img
                    src={incident.evidence_image}
                    alt="Incident evidence"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
            )} */}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          {!incident.resolved && (
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className={`px-6 py-2 rounded-lg text-white flex items-center ${
                isResolving
                  ? "bg-orange-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              } transition-colors`}
            >
              {isResolving ? (
                <>
                  <Clock className="mr-2 animate-pulse" size={18} />
                  Resolving...
                </>
              ) : (
                <>
                  <Check className="mr-2" size={18} />
                  Mark as Resolved
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;