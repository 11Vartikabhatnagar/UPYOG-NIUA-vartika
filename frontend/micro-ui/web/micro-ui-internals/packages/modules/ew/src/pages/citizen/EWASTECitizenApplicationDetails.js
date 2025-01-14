import { Card, CardSubHeader, Header, LinkButton, Loader, Row, StatusTable, MultiLink, PopUp, Toast, SubmitBar } from "@upyog/digit-ui-react-components";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";
import getEwAcknowledgementData from "../../utils/getEwAcknowledgementData";
import EWASTEWFApplicationTimeline from "../../pageComponents/EWASTEWFApplicationTimeline";
import ApplicationTable from "../../components/inbox/ApplicationTable";
import get from "lodash/get";

const EWASTECitizenApplicationDetails = () => {
  const { t } = useTranslation();
  const { requestId, tenantId } = useParams();
  const [showOptions, setShowOptions] = useState(false);
  const [showToast, setShowToast] = useState(null);
  const { data: storeData } = Digit.Hooks.useStore.getInitData();
  const { tenants } = storeData || {};


  const { isLoading, isError, error, data } = Digit.Hooks.ew.useEWSearch(
    {
      tenantId,
      filters: { applicationNumber: requestId },
    },
  );


  const [billData, setBillData] = useState(null);

  const EwasteApplication = get(data, "EwasteApplication", []);

  const ewId = get(data, "EwasteApplication[0].applicationNumber", []);

  let ew_details = (EwasteApplication && EwasteApplication.length > 0) || {};

  EwasteApplication.map((Appl) => {
    if (Appl.requestId == requestId) {
      ew_details = Appl;
    }
  })

  const application = ew_details;
  sessionStorage.setItem("ew-storage", JSON.stringify(application));

  const [loading, setLoading] = useState(false);

  const fetchBillData = async () => {
    setLoading(true);
    const result = await Digit.PaymentService.fetchBill(tenantId, { businessService: "ew-services", consumerCode: requestId, });

    setBillData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchBillData();
  }, [tenantId, requestId]);

  const { isLoading: auditDataLoading, isError: isAuditError, data: auditResponse } = Digit.Hooks.ew.useEWSearch(
    {
      tenantId,
      filters: { applicationNumber: ewId, audit: true },
    },
    {
      enabled: true,

    }
  );


  if (!ew_details.workflow) {
    let workflow = {
      id: null,
      tenantId: tenantId,
      businessService: "ew-services",
      businessId: application?.applicationNumber,
      action: "",
      moduleName: "ew-services",
      state: null,
      comment: null,
      documents: null,
      assignes: null,
    };
    ew_details.workflow = workflow;
  }

  if (isLoading || auditDataLoading) {
    return <Loader />;
  }

  const getAcknowledgementData = async () => {
    const applications = application || {};
    const tenantInfo = tenants.find((tenant) => tenant.code === applications.tenantId);
    const acknowldgementDataAPI = await getEwAcknowledgementData({ ...applications }, tenantInfo, t);
    Digit.Utils.pdf.generateTable(acknowldgementDataAPI);
  };

  const printCertificate = async () => {
    let response = await Digit.PaymentService.generatePdf(tenantId, { EwasteApplication: [data?.EwasteApplication?.[0]] }, "ewasteservicecertificate");
    const fileStore = await Digit.PaymentService.printReciept(tenantId, { fileStoreIds: response.filestoreIds[0] });
    window.open(fileStore[response?.filestoreIds[0]], "_blank");
  };

  let dowloadOptions = [];

  dowloadOptions.push({
    label: t("EWASTE_DOWNLOAD_ACK_FORM"),
    onClick: () => getAcknowledgementData(),
  });

  // currentForms is added to select the data of current field only whose data is being used 
  const currentForms = data?.EwasteApplication?.filter(form => form.requestId === requestId);

  if (currentForms[0]?.requestStatus === "REQUESTCOMPLETED") {
    dowloadOptions.push({
      label: t("EW_CERTIFICATE"),
      onClick: () => printCertificate(),
    });
  }


  const productcolumns = [
    { Header: t("PRODUCT_NAME"), accessor: "name" },
    { Header: t("PRODUCT_QUANTITY"), accessor: "quantity" },
    { Header: t("UNIT_PRICE"), accessor: "unit_price" },
    { Header: t("TOTAL_PRODUCT_PRICE"), accessor: "total_price" },
  ];

  const productRows = ew_details?.ewasteDetails?.map((product) => (
    {
      name: t(product.productName),
      quantity: product.quantity,
      unit_price: product.price/product.quantity,
      total_price: product.price,
    }
  )) || [];



  return (
    <React.Fragment>
      <div>
        <div className="cardHeaderWithOptions" style={{ marginRight: "auto", maxWidth: "960px" }}>
          <Header styles={{ fontSize: "32px", marginLeft: "10px" }}>{t("EW_APPLICATION_DETAILS")}</Header>
          {dowloadOptions && dowloadOptions.length > 0 && (
            <MultiLink
              className="multilinkWrapper"
              onHeadClick={() => setShowOptions(!showOptions)}
              displayOptions={showOptions}
              options={dowloadOptions}
            />
          )}
        </div>
        <Card>
          <StatusTable>
            <Row
              className="border-none"
              label={t("EW_REQUEST_ID")}
              text={ew_details?.requestId}
            />
          </StatusTable>

          <CardSubHeader style={{ fontSize: "24px" }}>{t("EW_ADDRESS_DETAILS")}</CardSubHeader>
          <StatusTable>
            <Row className="border-none" label={t("EW_PINCODE")} text={ew_details?.address?.pincode || t("CS_NA")} />
            <Row className="border-none" label={t("EW_CITY")} text={ew_details?.address?.city?.code || t("CS_NA")} /> 
            <Row className="border-none" label={t("EWASTE_STREET_NAME")} text={ew_details?.address?.street || t("CS_NA")} />
            <Row className="border-none" label={t("EWASTE_HOUSE_NO")} text={ew_details?.address?.doorNo || t("CS_NA")} />
            <Row className="border-none" label={t("EWASTE_HOUSE_NAME")} text={ew_details?.address?.buildingName || t("CS_NA")} />
            <Row className="border-none" label={t("EWASTE_ADDRESS_LINE1")} text={ew_details?.address?.addressLine1 || t("CS_NA")} />
            <Row className="border-none" label={t("EWASTE_ADDRESS_LINE2")} text={ew_details?.address?.addressLine2 || t("CS_NA")} />
            <Row className="border-none" label={t("EWASTE_LANDMARK")} text={ew_details?.address?.landmark || t("CS_NA")} />
          </StatusTable>

          <CardSubHeader style={{ fontSize: "24px" }}>{t("EW_APPLICANT_DETAILS")}</CardSubHeader>
          <StatusTable>
            <Row className="border-none" label={t("EWASTE_APPLICANT_NAME")} text={ew_details?.applicant?.applicantName || t("CS_NA")} />
            <Row className="border-none" label={t("EW_MOBILE_NUMBER")} text={ew_details?.applicant?.mobileNumber || t("CS_NA")} />
            <Row className="border-none" label={t("EW_EMAIL")} text={ew_details?.applicant?.emailId || t("CS_NA")} />
          </StatusTable>

          <CardSubHeader style={{ fontSize: "24px" }}>{t("EW_PRODUCT_DETAILS")}</CardSubHeader>
          <ApplicationTable
            t={t}
            data={productRows}
            columns={productcolumns}
            getCellProps={(cellInfo) => ({
              style: {
                minWidth: "150px",
                padding: "10px",
                fontSize: "16px",
                paddingLeft: "20px",
              },
            })}
            isPaginationRequired={false}
            totalRecords={productRows.length}
          />

          <br></br>
          <CardSubHeader style={{ fontSize: "24px" }}>{t("ES_EW_ACTION_TRANSACTION_ID")}</CardSubHeader>
          <StatusTable>
            {ew_details.calculatedAmount && <Row className="border-none" label={t("EWASTE_NET_PRICE")} text={ew_details?.calculatedAmount} />}
            {ew_details.finalAmount && <Row className="border-none" label={t("ES_EW_ACTION_FINALAMOUNT")} text={ew_details?.finalAmount} />}
            {ew_details.transactionId && <Row className="border-none" label={t("ES_EW_ACTION_TRANSACTION_ID")} text={ew_details?.transactionId} />}
            {ew_details.pickUpDate && <Row className="border-none" label={t("EW_PICKUP_DATE")} text={ew_details?.pickUpDate} />}
          </StatusTable>

          <EWASTEWFApplicationTimeline application={application} id={application?.requestId} userType={"citizen"} />
          {showToast && (
            <Toast
              error={showToast.key}
              label={t(showToast.label)}
              style={{ bottom: "0px" }}
              onClose={() => {
                setShowToast(null);
              }}
            />
          )}
        </Card>

      </div>
    </React.Fragment>
  );
};

export default EWASTECitizenApplicationDetails;








