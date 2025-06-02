
export  const IncidentBadge = ({ type }: { type: 'UNAUTHORIZED_EXIT' | 'DOUBLE_ENTRY_ATTEMPT' | 'NO_ENTRY_EXIT_ATTEMPT' }) => {
    const colors = {
      'UNAUTHORIZED_EXIT': 'bg-red-500 text-white',
      'DOUBLE_ENTRY_ATTEMPT': 'bg-orange-500 text-white',
      'NO_ENTRY_EXIT_ATTEMPT': 'bg-purple-500 text-white'
 
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[type]} shadow-md`}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  };