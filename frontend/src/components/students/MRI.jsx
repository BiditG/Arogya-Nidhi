import { useState, useEffect } from 'react';
import assets from '../../utils/studentAssets';

const MRI = () => {
  const cats = Object.keys(assets.MRI || {});
  const [category, setCategory] = useState('');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const options = [...cats, 'Other'];
  const images = (assets.MRI[category] || []);
  const url = images[index] || '';

  useEffect(() => {
    if (!category && cats.length) {
      const rc = cats[Math.floor(Math.random() * cats.length)];
      setCategory(rc);
      return;
    }
    if (images.length) {
      setIndex(Math.floor(Math.random() * images.length));
      setSubmitted(false);
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const submit = () => { if (selected === null) return; setSubmitted(true); };

  const isCorrect = () => {
    if (!submitted || selected === null) return null;
    return options[selected] === category;
  };

  const nextRandom = () => {
    if (!cats.length) return;
    const newCat = cats[Math.floor(Math.random() * cats.length)];
    const imgs = assets.MRI[newCat] || [];
    setCategory(newCat);
    setIndex(imgs.length ? Math.floor(Math.random() * imgs.length) : 0);
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <div className="sp-panel">
      <p style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)', marginBottom: '1rem' }}>
        View an MRI image, make a prediction about the condition, then submit to see if you are correct.
      </p>

      {url && (
        <div className="sp-image-frame">
          <img src={url} alt="MRI scan" />
        </div>
      )}

      <div className="sp-radio-group">
        {options.map((o, idx) => (
          <label
            key={idx}
            className={`sp-radio-option${selected === idx ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="mri_opt"
              checked={selected === idx}
              onChange={() => setSelected(idx)}
              style={{ display: 'none' }}
            />
            {o}
          </label>
        ))}
      </div>

      <div className="sp-row">
        <button onClick={submit} className="sp-btn-primary">Submit Prediction</button>
        <button onClick={nextRandom} className="sp-btn-secondary">Reset</button>
        <button onClick={nextRandom} className="sp-btn-secondary">Next Random</button>
      </div>

      {submitted && (
        <div className="sp-result-panel">
          <div className="sp-result-title">Result</div>
          <div className="sp-result-row">You selected: <strong>{options[selected]}</strong></div>
          <div className="sp-result-row">Correct label: <strong>{category}</strong></div>
          <div className={`sp-result-verdict ${isCorrect() ? 'correct' : 'wrong'}`}>
            {isCorrect() ? 'Correct!' : 'Incorrect'}
          </div>
        </div>
      )}
    </div>
  );
};

export default MRI;
