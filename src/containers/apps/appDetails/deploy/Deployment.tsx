import { Button, Col, Icon, Input, message, Row, Tooltip } from "antd";
import React from "react";
import DomUtils from "../../../../utils/DomUtils";
import Toaster from "../../../../utils/Toaster";
import Utils from "../../../../utils/Utils";
import ApiComponent from "../../../global/ApiComponent";
import { IAppDef, IAppVersion } from "../../AppDefinition";
import { AppDetailsTabProps } from "../AppDetails";
import AppLogsView from "./AppLogsView";
import AppVersionTable from "./AppVersionTable";
import BuildLogsView from "./BuildLogsView";
import GitRepoForm from "./GitRepoForm";
import TarUploader from "./TarUploader";
import UploaderPlainTextCaptainDefinition from "./UploaderPlainTextCaptainDefinition";
import UploaderPlainTextDockerfile from "./UploaderPlainTextDockerfile";

export default class Deployment extends ApiComponent<
  AppDetailsTabProps,
  {
    dummyVar: undefined;
    forceEditableCaptainDefinitionPath: boolean;
    buildLogRecreationId: string;
    updatedVersions:
      | { versions: IAppVersion[]; deployedVersion: number }
      | undefined;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      dummyVar: undefined,
      forceEditableCaptainDefinitionPath: false,
      updatedVersions: undefined,
      buildLogRecreationId: ""
    };
  }

  onUploadSuccess() {
    message.info("Build has started");
    this.setState({ buildLogRecreationId: "" + new Date().getTime() });
    DomUtils.scrollToTopBar();
  }

  onAppBuildFinished() {
    this.apiManager
      .getAllApps()
      .then((data) => {
        const appDefs = data.appDefinitions as IAppDef[];
        for (let index = 0; index < appDefs.length; index++) {
          const element = appDefs[index];
          if (element.appName === this.props.apiData.appDefinition.appName) {
            return Utils.copyObject(element);
          }
        }
        throw new Error("App not found!");
      })
      .then((app) => {
        this.setState({
          updatedVersions: {
            deployedVersion: app.deployedVersion,
            versions: app.versions
          }
        });
      })
      .catch(Toaster.createCatcher());
  }

  onVersionRollbackRequested(version: IAppVersion) {
    this.apiManager
      .uploadCaptainDefinitionContent(
        this.props.apiData.appDefinition.appName!,
        {
          schemaVersion: 2,
          // We should use imageName, but since imageName does not report build failure (since there is no build!)
          // If we use that, and the image is not available, the service will not work.
          dockerfileLines: ["FROM " + version.deployedImageName]
        },
        version.gitHash || "",
        true
      )
      .then(() => {
        this.onUploadSuccess();
      })
      .catch(Toaster.createCatcher());
  }

  render() {
    const app = this.props.apiData.appDefinition;
    const hasPushToken =
      app.appPushWebhook && app.appPushWebhook.pushWebhookToken;
    const repoInfo = app.appPushWebhook
      ? app.appPushWebhook.repoInfo
      : {
          user: "",
          password: "",
          branch: "",
          sshKey: "",
          repo: ""
        };

    const webhookPushUrlRelativePath = hasPushToken
      ? "/user/apps/webhooks/triggerbuild?namespace=captain&token=" +
        app.appPushWebhook!.pushWebhookToken
      : "";

    const webhookPushUrlFullPath =
      window.location.protocol +
      "//captain." +
      this.props.apiData.rootDomain +
      "/api/v2" +
      webhookPushUrlRelativePath;

    return (
      <div>
        <BuildLogsView
          onAppBuildFinished={() => this.onAppBuildFinished()}
          appName={app.appName!}
          buildLogRecreationId={this.state.buildLogRecreationId}
          key={app.appName! + "-" + this.state.buildLogRecreationId}
        />
        <div style={{ height: 20 }} />
        <hr />
        <div style={{ height: 20 }} />

        <AppVersionTable
          isMobile={this.props.isMobile}
          onVersionRollbackRequested={versionToRevert =>
            this.onVersionRollbackRequested(versionToRevert)
          }
          versions={
            this.state.updatedVersions
              ? this.state.updatedVersions.versions
              : app.versions
          }
          deployedVersion={
            this.state.updatedVersions
              ? this.state.updatedVersions.deployedVersion
              : app.deployedVersion
          }
        />

        <div style={{ height: 20 }} />
        <AppLogsView appName={app.appName!} key={app.appName! + "-LogsView"} />

        <hr />
        <div style={{ height: 40 }} />
        <h4>
          <Icon type="rocket" /> Method 1: Official CLI
        </h4>
        <p>
          Use CLI deploy command. This is the easiest method as it only requires
          a simply command like <code>caprover deploy</code>. Read more about it
          in the{" "}
          <a
            href="https://caprover.com/docs/get-started.html#step-4-deploy-the-test-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs
          </a>
        </p>
        <div style={{ height: 20 }} />
        <h4>
          <Icon type="rocket" /> Method 2: Tarball
        </h4>
        <p>
          You can simply create a tarball (<code>.tar</code>) of your project
          and upload it here via upload button.
        </p>

        <TarUploader
          onUploadSucceeded={() => this.onUploadSuccess()}
          appName={app.appName!}
        />

        <div style={{ height: 40 }} />
        <h4>
          <Icon type="rocket" /> Method 3: Deploy from Github/Bitbucket/Gitlab
        </h4>
        <p>
          Enter your repository information in the form and save. Then copy the
          URL in the box as a webhook on Github, Bitbucket, Gitlab and etc. Once
          you push a commit, CapRover starts a new build.
          <br />
        </p>
        <Row>
          <Input
            onFocus={e => {
              if (hasPushToken) {
                e.target.select();
                document.execCommand("copy");
                message.info("Copied to clipboard!");
              }
            }}
            className="code-input"
            readOnly={true}
            disabled={!hasPushToken}
            defaultValue={
              hasPushToken
                ? webhookPushUrlFullPath
                : "** Add repo info and save for this webhook to appear **"
            }
          />
        </Row>
        <br />
        <GitRepoForm
          gitRepoValues={repoInfo}
          updateRepoInfo={newRepo => {
            const newApiData = Utils.copyObject(this.props.apiData);
            if (newApiData.appDefinition.appPushWebhook) {
              newApiData.appDefinition.appPushWebhook.repoInfo = Utils.copyObject(
                newRepo
              );
            } else {
              newApiData.appDefinition.appPushWebhook = {
                repoInfo: Utils.copyObject(newRepo)
              };
            }
            this.props.updateApiData(newApiData);
          }}
        />
        <Row
          type="flex"
          justify="end"
          style={{ marginTop: this.props.isMobile ? 15 : 0 }}
        >
          <Button
            disabled={!hasPushToken}
            style={{ marginRight: this.props.isMobile ? 0 : 10 }}
            block={this.props.isMobile}
            onClick={() => {
              this.apiManager
                .forceBuild(webhookPushUrlRelativePath)
                .then(() => {
                  this.onUploadSuccess();
                })
                .catch(Toaster.createCatcher());
            }}
          >
            Force Build
          </Button>
          <Button
            disabled={!repoInfo.repo}
            type="primary"
            style={{ marginTop: this.props.isMobile ? 15 : 0 }}
            block={this.props.isMobile}
            onClick={() => this.props.onUpdateConfigAndSave()}
          >
            Save &amp; Update
          </Button>
        </Row>
        <div style={{ height: 20 }} />
        <h4>
          <Icon type="rocket" /> Method 4: Deploy plain Dockerfile
        </h4>
        <UploaderPlainTextDockerfile
          appName={app.appName!}
          onUploadSucceeded={() => this.onUploadSuccess()}
        />
        <div style={{ height: 20 }} />
        <h4>
          <Icon type="rocket" /> Method 5: Deploy captain-definition file
        </h4>
        <UploaderPlainTextCaptainDefinition
          appName={app.appName!}
          onUploadSucceeded={() => this.onUploadSuccess()}
        />
        <div style={{ height: 20 }} />
        <Row>
          <Col
            xs={{ span: 24 }}
            lg={{ span: 6 }}
            style={{ width: this.props.isMobile ? "100%" : 400 }}
          >
            {this.props.isMobile && "captain-definition Relative Path"}
            <Input
              addonBefore={
                !this.props.isMobile && "captain-definition Relative Path"
              }
              type="text"
              defaultValue={app.captainDefinitionRelativeFilePath + ""}
              disabled={!this.state.forceEditableCaptainDefinitionPath}
              onChange={e => {
                const newApiData = Utils.copyObject(this.props.apiData);
                newApiData.appDefinition.captainDefinitionRelativeFilePath =
                  e.target.value;
                this.props.updateApiData(newApiData);
              }}
            />
          </Col>
          <Col xs={{ span: 24 }} lg={{ span: 12 }}>
            <div
              style={{
                paddingLeft: this.props.isMobile ? 0 : 24,
                marginTop: this.props.isMobile ? 8 : 0
              }}
            >
              <Tooltip title="You shouldn't need to change this path unless you have a repository with multiple captain-definition files (mono repos). Read docs for captain definition before editing this">
                <Button
                  type="default"
                  block={this.props.isMobile}
                  disabled={this.state.forceEditableCaptainDefinitionPath}
                  onClick={() =>
                    this.setState({ forceEditableCaptainDefinitionPath: true })
                  }
                >
                  Edit
                </Button>
              </Tooltip>
              <Button
                style={{
                  marginLeft: this.props.isMobile ? 0 : 20,
                  marginTop: this.props.isMobile ? 8 : 0
                }}
                block={this.props.isMobile}
                disabled={!this.state.forceEditableCaptainDefinitionPath}
                type="primary"
                onClick={() => this.props.onUpdateConfigAndSave()}
              >
                Save &amp; Update
              </Button>
            </div>
          </Col>

          <Col span={6} />
        </Row>
      </div>
    );
  }
}
