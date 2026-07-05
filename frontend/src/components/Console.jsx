import React, { useEffect, useState } from 'react';
import { CertificateList } from './CertificateList.jsx';
import { SubmitForm } from './SubmitForm.jsx';
import { ScorecardDetail } from './ScorecardDetail.jsx';
import { useCertificates } from '../hooks/useCertificates.js';

export function Console({ wallet }) {
  const { certificates, loading, error, refresh } = useCertificates(30);
  const [selectedId, setSelectedId] = useState(null);

  // Default to the newest certificate whenever the list changes.
  useEffect(() => {
    if (!selectedId && certificates.length > 0) {
      setSelectedId(certificates[0].assessment_id);
    }
  }, [certificates, selectedId]);

  return (
    <section className="section" id="console">
      <div className="container">
        <p className="section__eyebrow">console</p>
        <h2 className="section__title">
          Read and write the live contract.
        </h2>
        <p className="section__lead">
          Everything below reads directly from the SetProof contract on
          Bradbury and, for writes, sends transactions from your connected
          wallet.
        </p>

        <div className="console">
          <SubmitForm
            wallet={wallet}
            onSubmitted={() => setTimeout(refresh, 3000)}
          />
          <CertificateList
            certificates={certificates}
            loading={loading}
            error={error}
            onRefresh={refresh}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </div>

        <div style={{ marginTop: 32 }} className="grid grid--3">
          <div style={{ gridColumn: '1 / -1' }}>
            <ScorecardDetail assessmentId={selectedId} />
          </div>
        </div>
      </div>
    </section>
  );
}
