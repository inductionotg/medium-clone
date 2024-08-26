import React, { Component } from "react";
import {
    CanvasButton, CanvasTextArea, CanvasDropdown, CanvasInput, CanvasAlerts
} from "rf-canvas";
import TaskService from "../../services/TaskService";
import ValidateAndSubmitService from "../../services/ValidateAndSubmitService";

import "./TaskHome.css";
import atob from "atob";
import RollbackService from "../../../services/RollbackService";
import axios from "axios";
import SpinnerComponent from "../../Common/SpinnerComponent";
import { getEastServiceUrl } from "../../Common/BaseUrl";

class RollBackModalScreen extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        const queryMap = this.props.queryMap || {};
        let queryParams = {};
        queryParams["projectId"] = queryMap.projectId;
        queryParams["nfid"] = queryMap.nfid;
        queryParams["etokenId"] = queryMap.etokenId;
        queryParams["externalTaskId"] = queryMap.externalTaskId;
        queryParams["internalTaskId"] = queryMap.internalTaskId;
        queryParams["vzid"] = queryMap.etokenId && atob(queryMap.etokenId);

        this.state = {
            queryMap: queryParams,
            taskData: [],
            filteredTaskData: [],
            vzid: queryMap.etokenId ? atob(queryMap.etokenId) : "",
            comments: null,
            fromTaskName: queryMap.title,
            toTaskName: null,
            completedTaskList: [{ value: "", label: "--Select--" }],
            showAlert: false,
            alertType: "notice",
            alertText: null,
            rollbackSeqId: 0,
            buttonflag: false,
            userName: null,
        };

        this.taskService = new TaskService();
        this.ValidateAndSubmitService = new ValidateAndSubmitService();
        this.rollbackService = new RollbackService();
    }

    async componentDidMount() {
        // updateScreenName("RollBack Page");
        console.log("Roll back Modal screen headphone");
        console.log(this.props.queryMap);
        const { nfid, projectId } = this.props.queryMap;
        await this.taskService.getCompletedTaskList(nfid, projectId).then(
            (res) => {
                let completedTaskList = [];
                completedTaskList = res.taskList?.length > 0 ? res.taskList : [];
                // this.setState({ completedTaskList: completedTaskList })
                var result = [];
                completedTaskList && completedTaskList.forEach(task => {
                    if (task.includes("Redo")) {
                        result.push({ value: task, label: task });
                    }
                });

                if (result && result.length > 0) {
                    this.setState({ completedTaskList: result });
                }
            }
        ).catch((er) => {
            console.log(er);
            this.showPopupAlert("Error: Unable to fetch completed task details", "warning");
        });

        await this.rollbackService.getNewRollbackId()
            .then((resp) => {
                console.log("rollid", resp.data);
                this.setState({ rollbackSeqId: resp.data });
            }).catch((ero) => {
                console.log("ero", ero);
            });

        let vzid = this.state.queryMap.vzid ? this.state.queryMap.vzid : "SYSTEM";
        let userName = "SYSTEM";
        if (vzid !== "SYSTEM") {
            await this.rollbackService.searchDelegate(vzid).then((rep) => {
                let data = rep && rep.data;
                let detail = data && data.delegationArray && data.delegationArray.length && data.delegationArray[0];
                if (detail && detail.name) {
                    userName = (detail.name.split(",")[1] || "") + " " + (detail.name.split(",")[0] || "");
                }
                console.log("user", userName);
            }).catch((er) => {
                console.log("User Name fetch error", er);
            });
        }
        this.setState({ userName: userName });
    }

    handleRollbackButtonClick = async () => {
        let vzid = this.state.queryMap.vzid ? this.state.queryMap.vzid : "SYSTEM";
        let userName = this.state.userName;
        console.log("Rollback button was clicked by ritesh")

        let addRollback = {
            "rollbackSeqId": this.state.rollbackSeqId,
            "nfProjectId": parseInt(this.state.queryMap.projectId),
            "nfid": this.state.queryMap.nfid,
            "fromTaskName": this.state.fromTaskName,
            "toTaskName": "Redo " + this.state.toTaskName,
            "internalTaskId": this.state.queryMap.internalTaskId,
            "externalTaskId": this.state.queryMap.externalTaskId,
            "rollbackComments": this.state.comments,
            "rollbackResponse": "",
            "actionType": "REROUTE",
            "lastUpdatedBy": userName,
            "changeDate": new Date().toUTCString(),
            "initialFromTask": this.state.fromTaskName,
            "initialExternalTaskId": this.state.queryMap.externalTaskId
        };

        console.log("rollback payload", addRollback);
        await this.rollbackService.addRollbackDetails(addRollback)
            .then(async (resp) => {
                console.log("rollback add", resp);
                this.showPopupAlert("Rollback details saved successfully", "success");
                this.setState({ buttonflag: false });
                await this.rollbackService.triggerRollbackNotificationEmail(this.state.queryMap.nfid, vzid).then((rp) => {
                    console.log("email notification sent successfully", rp);
                }).catch((er) => {
                    console.log("email notification call failed with error", er);
                });
            }).catch((err) => {
                console.log("rollback add", err);
                this.showPopupAlert("Error: Unable to save Rollback details", "warning");
            });

        let AuditPayload = [];

        let data = {
            "nfid": this.state.queryMap.nfid,
            "lastModifiedBy": "0",
            "description": `From ${this.state.fromTaskName} To Redo ${this.state.toTaskName}`,
            "isVisible": "Y",
            "userName": vzid,
            "numericMin": "200",
            "numericMax": "300",
            "element": "Rollback Comments"
        };
        AuditPayload.push(data);

        await this.ValidateAndSubmitService.createJobTrackingDetails(AuditPayload)
            .then((response) => {
                console.log("Audit Trail log", response);
                // this.showPopupAlert("Rollback comments saved successfully!", "success");
            }).catch((error) => {
                console.log("Audit Trail log", error);
                this.showPopupAlert("Unable to save in Audit Trial", "warning");
            });

        let taskid = "";
        let caseId = "";
        let externalTaskId = this.state.queryMap.externalTaskId;
        if (externalTaskId !== null && externalTaskId !== "") {
            const taskIdIndex = externalTaskId.lastIndexOf("-");
            taskid = externalTaskId.slice(taskIdIndex + 1, externalTaskId.length);
            if (externalTaskId.split("-").length >= 2)
                caseId = externalTaskId.split("-")[1];
        }

        let rpload = {
            "contents": {},
            "bonitaProcessName": "TCRProcess",
            "bonitaMessageName": "rollbackSignal",
            "correlations": {
                "rollbackSignal": this.state.queryMap.nfid
            },
            "bonitaFlowNodeName": "Rollback Signal"
        };

        let rURL = getEastServiceUrl() + "/wfm-pam-services/pam/send/message";
        let taskResponse = await axios.post(rURL, rpload);
        if (taskResponse.status === 200) {
            if (taskResponse.data.statusCode === 0) {
                this.showPopupAlert("Rollback details saved successfully!", "success");
                if (this.props.showAlert)
                    this.props.showAlert({ text: `Rollback done to ${this.state.toTaskName} successfully!`, type: 'success', timeout: 8000 });
            }
        } else {
            this.showPopupAlert("Error: Unable to save Rollback details", "warning");
            if (this.props.showAlert)
                this.props.showAlert({ text: 'Error: Unable to save Rollback details', type: 'warning', timeout: 8000 });
        }
    }

    showPopupAlert = (alertText, alertType) => {
        window.scroll({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
        this.setState({ showAlert: true, alertType: alertType, alertText: alertText });
    }

    render() {
        return (
            <div className="rollbackModalScreen">
                <SpinnerComponent/>
                {this.state.showAlert && (
                    <CanvasAlerts
                        alertType={this.state.alertType}
                        onClickCloseIcon={() => this.setState({ showAlert: false })}
                    >
                        {this.state.alertText}
                    </CanvasAlerts>
                )}
                <div className="row">
                    <div className="col-4">
                        <CanvasInput
                            labelName="From Task"
                            //colSize="xs6-sm4-md4-lg3"
                            //onClick={(e) => { console.log('Input onClick event: ', e.target.value) }}
                            //onChange={(e) => { console.log('Input onChange event: ', e.target.value); this.setState({ inputValue: e.target.value }) }}
                            value={this.state.fromTaskName}
                            disabled={true}
                        />
                    </div>
                    <div className="col-4">
                        <CanvasDropdown
                            selectOptions={this.state.completedTaskList}
                            value={this.state.toTaskName}
                            onChange={(value) => {
                                console.log("The selected toTask is: ", value);
                                this.setState({ toTaskName: value });
                            }}
                            placeholder="--Select one--"
                            //colSize="xs6-sm4-md4-lg3"
                            labelName="To Task"
                            isRequired
                        />
                    </div>
                </div>
                <div className="row" onMouseLeave={this.saveComments}>
                    <div className="col-8">
                        <CanvasTextArea
                            labelName={'Rollback Comments'}
                            name={'Rollback Comments'}
                            maxLength={1000}
                            rows={2}
                            colSize="xs12-sm12-md12-lg12"
                            isRequired={true}
                            onInput={(e) => {
                                this.setState({ comments: e.target && e.target.value });
                            }}
                        >
                            {this.state.comments}
                        </CanvasTextArea>
                    </div>
                </div>
                <div className="row">
                    <div className="flex-left">
                        <CanvasButton
                            onClick={() => {
                                this.handleRollbackButtonClick();
                            }}
                            disabled={!(this.state.comments && this.state.toTaskName)}
                            type={'primary'}
                            size={'medium'}
                            children={'Submit'}
                        />
                        <CanvasButton
                            onClick={() => {
                                this.onClear();
                            }}
                            disabled={false}
                            type={'secondary'}
                            size={'medium'}
                            children={'Clear'}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default RollBackModalScreen;
