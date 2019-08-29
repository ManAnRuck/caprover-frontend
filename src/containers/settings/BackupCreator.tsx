import { Button, Icon, message, Row } from "antd";
import React from "react";
import Toaster from "../../utils/Toaster";
import ApiComponent from "../global/ApiComponent";
import CenteredSpinner from "../global/CenteredSpinner";

export default class BackupCreator extends ApiComponent<
  {
    isMobile: boolean;
  },
  {
    isLoading: boolean;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      isLoading: false
    };
  }

  onCreateBackupClicked() {
    this.setState({ isLoading: true });
    this.apiManager
      .createBackup()
      .then((data) => {
        let link = document.createElement("a"); //create 'a' element
        link.setAttribute(
          "href",
          this.apiManager.getApiBaseUrl() +
            "/downloads/?namespace=captain&downloadToken=" +
            encodeURIComponent(data.downloadToken)
        );
        link.click();

        message.success("Downloading backup started...");
      })
      .catch(Toaster.createCatcher())
      .then(() => {
        this.setState({ isLoading: false });
      });
  }

  render() {
    if (this.state.isLoading) {
      return <CenteredSpinner />;
    }

    return (
      <div>
        <p>
          Create a backup of CapRover configs in order to be able to spin up a
          clone of this server. Note that your application data (volumes, and
          images) are not part of this backup. This backup only includes the
          server configuration details, such as root domains, app names, SSL
          certs and etc.
        </p>
        <p>
          See the documents for more details on how to restore your server using
          the backup file.
        </p>
        <p>Note that this is, currently, an EXPERIMENTAL FEATURE.</p>
        <br />

        <Row type="flex" justify="end">
          <Button type="primary" block={this.props.isMobile} onClick={() => this.onCreateBackupClicked()}>
            <span>
              <Icon type="cloud-download" />
            </span>{" "}
            &nbsp; Create Backup
          </Button>
        </Row>
      </div>
    );
  }
}
