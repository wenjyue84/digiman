// Ultra-simple nationality field with zero dependencies
export function NationalityField({ onChange, error, hint, label }: any) {
  const nationalities = [
    "Malaysian", "Singaporean", "American", "Australian", "Bangladeshi", "British", 
    "Bruneian", "Cambodian", "Canadian", "Chinese", "Filipino", "French", "German", 
    "Indonesian", "Indian", "Italian", "Japanese", "Korean", "Laotian", "Myanmar", 
    "Nepalese", "Pakistani", "Sri Lankan", "Thai", "Vietnamese", "Other"
  ];

  const handleSelectChange = (e: any) => {
    const value = e.target.value;
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div>
      <label 
        htmlFor="nationality-basic" 
        style={{ 
          display: 'block', 
          fontSize: '14px', 
          fontWeight: '500', 
          marginBottom: '4px',
          color: '#374151'
        }}
      >
        {label || "Nationality"}
      </label>
      <select
        id="nationality-basic"
        defaultValue="Malaysian"
        onChange={handleSelectChange}
        style={{
          width: '100%',
          height: '40px',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: 'white',
          fontSize: '14px',
          outline: 'none'
        }}
      >
        {nationalities.map((nationality) => (
          <option key={nationality} value={nationality}>
            {nationality}
          </option>
        ))}
      </select>
      {hint && (
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {hint}
        </p>
      )}
      {error && (
        <p style={{ fontSize: '14px', color: '#ef4444', marginTop: '4px' }}>
          {error}
        </p>
      )}
    </div>
  );
}